import { declare } from "@babel/helper-plugin-utils";
import { PluginPass, types as t } from "@babel/core";
// eslint-disable-next-line
import { Visitor } from "@babel/traverse";

// Map JS operators to RQL operators
const OPERATOR_MAP = {
  "===": "==",
  "!==": "!=",
};

// Map JS string functions (fake - they only exist as Typescript definitions)  to RQL operators
const STRING_FN_MAP = {
  startsWith: "BEGINSWITH",
  endsWith: "ENDSWITH",
  contains: "CONTAINS",
  like: "LIKE",
};

// Map JS array functions (fake - they only exist as Typescript definitions) to RQL operators
const ARRAY_FN_MAP = {
  any: "ANY",
  all: "ALL",
};

// Returns a new FilterVisitor, which visits a Realm JS typesafe query expression and converts
// it into an RQL query string, and stores any captured variables used by the query.
//
// The output of the FilterVisitor is an ArrayExpression of the form:
// `["RQL query as string", capturedVariableName1, capturedVariableName2, ...]`
// which is then transformed back into args for the call to `.filtered`
const makeFilterVisitor = (): Visitor<PluginPass> => {
  // Keep count of the number of referenced variables we've encountered
  // so that we can replace with the appropriate `$x` placeholder
  let referencedVariableCount = 0;

  return {
    // Convert binary expressions (e.g. `t.age > 30` or `t.age > ageQuery`) into their RQL equivalent.
    // The result is stored by replacing the node with an ArrayExpression of the form:
    // `["age > 30"]` or `["age > $0", ageQuery]` (where `ageQuery` is a variable in the current scope)
    BinaryExpression(path) {
      const operator = OPERATOR_MAP[path.node.operator] || path.node.operator;

      let value;
      let capture;
      if (path.node.right.type === "Identifier") {
        // If the right-hand node is an identifier, we are referring to a variable
        value = `$${referencedVariableCount}`;
        capture = path.node.right.name;
        referencedVariableCount++;
      } else {
        // Otherwise it is a value
        value = path.node.right.value;
      }

      // Replace the node with the ArrayExpression to store the intermediate result
      path.replaceWith(
        t.arrayExpression(
          [
            t.stringLiteral(
              `${path.node.left.property.name} ${operator} ${value}`
            ),
            capture ? t.identifier(capture) : undefined,
          ].filter((x) => x !== undefined)
        )
      );
    },

    // Convert unary expressions (`!t.completed`) into their RQL equivalent.
    // The result is stored by replacing the node with an ArrayExpression of the form:
    // `["t.completed == false"]`
    UnaryExpression(path) {
      if (path.node.operator !== "!") {
        throw new Error(
          `Unsupported operator ${path.node.operator} for UnaryExpression`
        );
      }

      path.replaceWith(
        t.arrayExpression([
          t.stringLiteral(`${path.node.argument.property.name} == false`),
        ])
      );
    },

    // Convert logical expressions (e.g. `t.age > 30 || t.name === name` - more generally,
    // `expressionA || expressionB`) into their RQL equivalent. The individual expressions
    // (or any nested logical expressions) will be recursively transformed into their RQL
    // equivalent by the visitor.
    //
    // The result is stored by replacing the node with an ArrayExpression of the form:
    // `['(t.age > 30 || t.name == $0)', name]
    LogicalExpression: {
      exit(path) {
        const els = [
          t.stringLiteral(
            `(${path.node.left.elements[0].value} ${path.node.operator} ${path.node.right.elements[0].value})`
          ),
          ...path.node.left.elements.slice(1),
          ...path.node.right.elements.slice(1),
        ].filter((x) => x !== undefined);

        path.replaceWith(t.arrayExpression(els));
      },
    },

    // Handle "fake" call expressions on arrays and strings.
    // See inline documentation.
    CallExpression: {
      enter(path) {
        if (ARRAY_FN_MAP[path.node.callee.property.name]) {
          // Convert call expressions on arrays e.g. `t.children.any(c => c.name === name)` into
          // their RQL equivalent.
          //
          // The result is stored by replacing the node with an ArrayExpression of the form:
          // `['__CONCATENATE__', 'ANY children.', (binary expression node)], in order to allow
          // the visitor to then recusively visit the expression node and change it into:
          // `['__CONCATENATE__', 'ANY children.', ['name == $0', name]]`, which the ArrayExpression
          // handler then converts back to a single string.

          const fn = ARRAY_FN_MAP[path.node.callee.property.name];

          const name = path.node.callee.object.property.name;
          path.replaceWith(
            t.arrayExpression([
              t.stringLiteral("__CONCATENATE__"),
              t.stringLiteral(`${fn} ${name}.`),
              path.node.arguments[0].body,
            ])
          );
        } else if (STRING_FN_MAP[path.node.callee.property.name]) {
          // Convert call expressions on strings e.g. `t.name.startsWith(query)` into
          // their RQL equivalent.
          //
          // The result is stored by replacing the node with an ArrayExpression of the form:
          // `['name BEGINSWITH $0', query]`

          const fn = STRING_FN_MAP[path.node.callee.property.name];

          // TODO duplicated logic with BinaryExpression
          let value;
          let capture;

          const valueNode = path.node.arguments[0];
          if (valueNode.type === "Identifier") {
            value = `$${referencedVariableCount}`;
            capture = valueNode.name;
            referencedVariableCount++;
          } else {
            value = `"${valueNode.value}"`;
          }

          const property = path.node.callee.object.property.name;
          const modifier = path.node.arguments[1]?.value ? "[c]" : "";

          path.replaceWith(
            t.arrayExpression(
              [
                t.stringLiteral(`${property} ${fn}${modifier} ${value}`),
                capture ? t.identifier(capture) : undefined,
              ].filter((x) => x !== undefined)
            )
          );
        }
      },
    },

    // Handle instructions encoded into an array by other nodes e.g. concatenation.
    // See inline documentation.
    ArrayExpression: {
      exit(path) {
        // Converts an instruction in the form: `['__CONCATENATE__', 'ANY children.', ['name == $0', name]]`
        // into: [`ANY children.name == $0`, name]
        if (path.node.elements[0].value === "__CONCATENATE__") {
          path.replaceWith(
            t.arrayExpression([
              t.stringLiteral(
                `${path.node.elements[1].value}${path.node.elements[2].elements[0].value}`
              ),
              ...path.node.elements[2].elements.slice(1),
            ])
          );
        }
      },
    },

    // Convert "truthy" member expressions (e.g. `t.completed`) into their RQL equivalent.
    // The result is stored by replacing the node with an ArrayExpression of the form:
    // `['completed == true']`
    MemberExpression(path) {
      const { name } = path.node.property;

      path.replaceWith(t.arrayExpression([t.stringLiteral(`${name} == true`)]));
    },
  };
};

export default declare((api) => {
  api.assertVersion(7);

  return {
    name: "realm-typesafe-queries",

    visitor: {
      // When we encounter an arrow function...
      ArrowFunctionExpression: {
        enter(path) {
          // Get the name of the function that this arrow fn is being passed as an arg to (if any)
          const functionName = path.parent?.callee?.property?.name;

          // If the name of that function is not `filtered`, don't transform the function
          if (functionName !== "filtered") {
            return;
          }

          // Otherwise, visit it with a FilterVisitor, which will transform it into an ArrayExpression of the form:
          // `["RQL query as string", capturedVariableName1, capturedVariableName2, ...]`
          const visitor = makeFilterVisitor();
          path.traverse(visitor);
          const body = path.node.body;

          // And then make the elements of that resulting array the args to the call to filtered, so we end up with:
          // `.filtered("RQL query as string", capturedVariableName1, capturedVariableName2, ...)`
          path.parentPath.node.arguments = body.elements;
        },
      },
    },
  };
});

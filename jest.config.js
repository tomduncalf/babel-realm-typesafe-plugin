const fs = require("fs");
const semver = require("semver");
const nodeVersion = process.versions.node;
const supportsESMAndJestLightRunner = semver.satisfies(
  nodeVersion,
  // ^12.22 || >=14.17 : Node will throw "t.isIdentifier is not a function" when test is running in worker threads.
  // ^13.7: `resolve.exports` specifies conditional exports in package.json
  "^12.22 || ^13.7 || >=14.17"
);
const isPublishBundle = process.env.IS_PUBLISH;

let LIB_USE_ESM = false;
try {
  const type = fs.readFileSync(`${__dirname}/.module-type`, "utf-8").trim();
  LIB_USE_ESM = type === "module";
} catch (_) {}

module.exports = {
  runner: supportsESMAndJestLightRunner ? "jest-light-runner" : "jest-runner",

  collectCoverageFrom: ["src/**/*.{js,mjs,ts}"],
  // The eslint/* packages use ESLint v6, which has dropped support for Node v6.
  // TODO: Remove this process.version check in Babel 8.
  testRegex: `./test/.+\\.m?js$`,
  testPathIgnorePatterns: [
    "/node_modules/",
    "/test/fixtures/",
    "/test/debug-fixtures/",
    "/babel-parser/test/expressions/",
    "/test/tmp/",
    "/test/__data__/",
    "/test/helpers/",
    "<rootDir>/test/warning\\.js",
    "<rootDir>/build/",
    "<rootDir>/.history/", // local directory for VSCode Extension - https://marketplace.visualstudio.com/items?itemName=xyz.local-history
    "_browser\\.js",
    // Some tests require internal files of bundled packages, which are not available
    // in production builds. They are marked using the .skip-bundled.js extension.
    ...(isPublishBundle ? ["\\.skip-bundled\\.js$"] : []),
    ...(LIB_USE_ESM ? ["/babel-helpers/"] : []),
    // Ignore @babel/standalone test in coverage testing because it is not built
    ...(process.env.TEST_TYPE === "cov"
      ? ["<rootDir>/packages/babel-standalone/"]
      : []),
  ],
  testEnvironment: "node",
  transformIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/packages/babel-standalone/babel(\\.min)?\\.js",
    "/test/(fixtures|tmp|__data__)/",
    "<rootDir>/(packages|codemods|eslint)/[^/]+/lib/",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/packages/babel-standalone/babel(\\.min)?\\.js",
    "/test/(fixtures|tmp|__data__)/",
  ],
  modulePathIgnorePatterns: [
    "/test/fixtures/",
    "/test/tmp/",
    "/test/__data__/",
    "<rootDir>/build/",
  ],
  // We don't need module name mappers here as depedencies of workspace
  // package should be declared explicitly in the package.json
  // Yarn will generate correct file links so that Jest can resolve correctly
  moduleNameMapper: null,
};

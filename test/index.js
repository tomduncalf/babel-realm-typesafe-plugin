import _runner from "@babel/helper-plugin-test-runner";
const runner = _runner.default;

runner(import.meta.url, {
  ignoreTasks: ["collection operators", "logical expressions not working"],
  // onlyTasks: ["collection operators"],
  // [
  //   "react",
  //   "array methods",
  //   "string methods",
  //   "unary operators",
  // ],
});

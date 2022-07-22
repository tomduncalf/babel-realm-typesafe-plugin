/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */
class ChecklistItem {}

class Task {}

const realm = new Realm({
  schema: [{
    name: "Task",
    properties: {
      name: "string",
      age: "int",
      completed: "bool",
      relatedTasks: "Task[]",
      checklistItems: "ChecklistItem[]"
    }
  }, {
    name: "ChecklistItem",
    properties: {
      description: "string",
      completed: "bool"
    }
  }]
});

const randomString = () => [...new Array(Math.floor(Math.random() * 30))].map(() => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

if (!realm.objects("Task").length) {
  let allChecklistItems = [];

  for (let i = 0; i < 100; i++) {
    realm.write(() => {
      const item = realm.create("ChecklistItem", {
        description: randomString(),
        completed: Math.random() > 0.5
      });
      allChecklistItems.push(item);
    });
  }

  for (let i = 0; i < 100; i++) {
    realm.write(() => {
      realm.create("Task", {
        name: randomString(),
        age: Math.floor(Math.random() * 100),
        completed: Math.random() > 0.5,
        checklistItems: [...new Array(3)].map(() => allChecklistItems[Math.floor(Math.random() * 100)])
      });
    });
  }

  realm.objects("Task").forEach(task => {
    realm.write(() => {
      const relatedTasks = [...new Array(3)].map(() => realm.objects("Task")[Math.floor(Math.random() * 100)]); // console.log({relatedTasks});

      task.relatedTasks = relatedTasks;
    });
  });
}

const App = () => {
  const nameQuery = "abc 0.3";
  const ageQuery = 30;
  console.log( // realm.objects<Task>('Task'),
  realm.objects("Task") // .filtered(t => t.checklistItems.any(i => i.description.startsWith('a'))),
  .filtered("ANY relatedTasks.age < 30") // .filtered(t => t.age > 50 && t.age < 60 && t.completed),
  // .filtered(t => t.name.startsWith(nameQuery, true)), // && t.age > 30 && t.completed),
  // .filtered(t => t.name.like('*bc*3', true)),
  // .filtered(t => t.age < ageQuery),
  ); // console.log(realm.objects('Task'));
  // return <View />;
};

realm.objects('Test').filtered("ANY relatedItems.age > 30");
realm.objects('Test').filtered("ANY relatedItems.age > $0", age);
realm.objects('Test').filtered("ALL relatedItems.age > 30");
realm.objects('Test').filtered("ALL relatedItems.age > $0", age);

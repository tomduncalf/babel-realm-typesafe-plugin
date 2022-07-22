const age = 10;
realm.objects('Test').filtered("age == $0", age);
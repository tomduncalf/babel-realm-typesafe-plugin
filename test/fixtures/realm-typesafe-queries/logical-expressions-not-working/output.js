realm.objects('Test').filtered("((age == $0 || name == $1) && parent.name == $2)", age, name, parentName);

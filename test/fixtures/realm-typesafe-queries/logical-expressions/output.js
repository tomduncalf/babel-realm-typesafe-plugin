realm.objects('Test').filtered("(age == $0 && married == false)", age);
realm.objects('Test').filtered("(age == $0 && name == $1)", age, name);
realm.objects('Test').filtered("((age == $0 || name == $1) && middleName == $2)", age, name, middleName);

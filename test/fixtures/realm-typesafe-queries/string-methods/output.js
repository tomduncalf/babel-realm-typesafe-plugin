realm.objects('Test').filtered("name BEGINSWITH \"a\"");
realm.objects('Test').filtered("name BEGINSWITH[c] \"a\"");
realm.objects('Test').filtered("name BEGINSWITH $0", nameQuery);
realm.objects('Test').filtered("name CONTAINS \"a\"");
realm.objects('Test').filtered("name ENDSWITH \"a\"");
realm.objects('Test').filtered("name LIKE \"a\"");


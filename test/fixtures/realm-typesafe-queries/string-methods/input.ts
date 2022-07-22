realm.objects('Test').filtered(o => o.name.startsWith("a"));
realm.objects('Test').filtered(o => o.name.startsWith("a", true));
realm.objects('Test').filtered(o => o.name.startsWith(nameQuery));
realm.objects('Test').filtered(o => o.name.contains("a"));
realm.objects('Test').filtered(o => o.name.endsWith("a"));
realm.objects('Test').filtered(o => o.name.like("a"));

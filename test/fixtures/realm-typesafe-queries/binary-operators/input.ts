realm.objects('Test').filtered(o => o.age === 10);
realm.objects('Test').filtered(o => o.age !== 10);
realm.objects('Test').filtered(o => o.age > 10);
realm.objects('Test').filtered(o => o.age >= 10);
realm.objects('Test').filtered(o => o.age < 10);
realm.objects('Test').filtered(o => o.age <= 10);
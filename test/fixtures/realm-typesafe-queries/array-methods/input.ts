realm.objects('Test').filtered(o => o.relatedItems.any(x => x.age > 30));
realm.objects('Test').filtered(o => o.relatedItems.any(x => x.age > age));
realm.objects('Test').filtered(o => o.relatedItems.all(x => x.age > 30));
realm.objects('Test').filtered(o => o.relatedItems.all(x => x.age > age));
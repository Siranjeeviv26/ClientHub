const m = require('mongoose');
m.connect('mongodb://localhost:27017/clienthub').then(async () => {
  const db = m.connection.db;
  const roles = await db.collection('roles').find({}).toArray();
  console.log('roles count', roles.length);
  for (const r of roles) {
    console.log('-', r.name, '| sys:', r.isSystem, '| org:', String(r.organizationId || 'global'), '| perms:', (r.permissions || []).length, '| has org:create:', (r.permissions || []).includes('organization:create'));
  }
  const users = await db.collection('users').find({}, { projection: { email: 1, role: 1, organizationId: 1 } }).toArray();
  console.log('users:');
  for (const u of users) console.log('-', u.email, u.role, String(u.organizationId));
  await m.disconnect();
}).catch(e => console.error('ERR', e.message));

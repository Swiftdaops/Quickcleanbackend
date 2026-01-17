#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.DB_URI;
  if (!uri) {
    console.error('No DB_URI found in environment');
    process.exit(1);
  }

  console.log('Using DB_URI (masked):', uri.replace(/:(.*)@/, ':****@'));

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log('Databases on server:');
    dbs.databases.forEach((d) => console.log(' -', d.name, `(sizeOnDisk: ${d.sizeOnDisk})`));

    // Determine DB name either from DB_NAME env or path in URI
    let dbName = (process.env.DB_NAME || '').trim();
    if (!dbName) {
      try {
        const url = new URL(uri);
        const p = (url.pathname || '').replace(/^\//, '');
        if (p) dbName = p;
      } catch (e) {
        // ignore
      }
    }

    if (!dbName) {
      console.log('\nNo target DB name found (DB_NAME or /<dbname> in DB_URI).');
      console.log('Set DB_NAME or include /<dbname> in DB_URI to inspect collections.');
    } else {
      console.log('\nTarget DB name:', dbName);
      const cols = await client.db(dbName).listCollections().toArray();
      console.log('Collections in', dbName + ':', cols.map(c => c.name).join(', ') || '(none)');
      try {
        const storesCount = await client.db(dbName).collection('stores').countDocuments();
        console.log('stores collection document count:', storesCount);
      } catch (e) {
        console.log('stores collection not present or count failed');
      }
    }
  } catch (err) {
    console.error('Connection/inspection error:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
})();

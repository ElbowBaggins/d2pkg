import PouchDB from 'pouchdb';
import upsert from 'pouchdb-upsert';
PouchDB.plugin(require('pouchdb-erase'));
PouchDB.plugin(upsert);
const Pouch = PouchDB.defaults({
  adapter: 'leveldb',
  prefix: 'D:/D2Out/'
})
const app = require('express-pouchdb')(Pouch, {
  mode: 'minimumForPouchDB',
  configPath: 'D:/D2Out/config.json',
  logPath: 'D:/D2Out/log.txt',
  overrideMode: {
    include: ['routes/fauxton']
  }
});



export const patchDatabase = new Pouch('patches');

app.listen(3000);
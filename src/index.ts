import { PackageFs } from './destiny2/parse/package';

const packageFs = new PackageFs('C:\\Program Files (x86)\\Steam\\steamapps\\common\\Destiny 2\\');

async function load() {
  const database = await packageFs.getDatabase();
  return database.allDocs().then(entries => entries.rows.length);
}
load().then(tot => console.log(tot)).catch(err => console.error(err));
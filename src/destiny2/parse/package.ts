import { Subject, bindNodeCallback, concat, from, of } from 'rxjs';
import { map, mergeMap, concatAll, concatMap, filter, takeLast } from 'rxjs/operators';

// import { Oodle } from './oodle/oodle';
import { Patch } from '../interface/package/patch';
import { PatchParser } from './patch';
import { patchDatabase } from '../../database';
import { resolve } from 'path';
import { readdir, PathLike, open, close, read } from 'fs';
// import { streamToRx } from 'rxjs-stream';

const observeDirectory = bindNodeCallback<PathLike, string[]>(readdir);
// const observeFile = bindNodeCallback(readFile);
const observeFileDescriptor = bindNodeCallback(open);
const observeRead = bindNodeCallback(read);
const observeClose = bindNodeCallback(close);

const observeFileSlice = (path: string, start: number, count: number) => {
  return observeFileDescriptor(path, 'r+').pipe(
    mergeMap(descriptor => {
      const out = Buffer.alloc(count);
      return concat(
        observeRead(descriptor, out, 0, count, start).pipe(map(value => value[value.length - 1] as Buffer)),
        observeClose(descriptor)
      ).pipe(
        filter<Buffer>(value => value instanceof Buffer),
        map((value: Buffer) => value as Buffer)
      );
    })
  )
}

type Packages = { [index:string] : Patch[] }
export class PackageFs {
  // private readonly oodle: Oodle;
  private readonly packageDirectory: string;

  public readonly packages: Subject<Packages>;

  constructor(public readonly baseDirectory: string) {
    // this.oodle = new Oodle(baseDirectory);
    this.packageDirectory = resolve(baseDirectory, 'packages');
    this.packages = new Subject<Packages>();
    this.refresh();
  }

  refresh() {
    return concat(
      from((patchDatabase['erase']() as PromiseLike<PouchDB.Core.Response>)),
      observeDirectory(this.packageDirectory).pipe(
        concatAll(),
        concatMap(filename => observeFileSlice(resolve(this.packageDirectory, filename), 0, 0xA0000).pipe(map(buffer => {
          const patch = PatchParser.parse(buffer) as Patch;
          patch.filename = filename;
          return patch;
        }))),
        mergeMap(patch => from(patchDatabase.upsert(
          `x${patch.packageId.toString(16)}_${patch.patchId.toString(10)}`,
          (current) => Object.assign(current, patch)
        )))
      ),
      of(patchDatabase)
    ).pipe<PouchDB.Database<{}>>(takeLast<PouchDB.Database<{}>>(1)).toPromise();
  }

  printIds() {
    return concat(
      observeDirectory(this.packageDirectory).pipe(
        concatAll(),
        concatMap(filename => observeFileSlice(resolve(this.packageDirectory, filename), 0, 0xA0000).pipe(map(buffer => {
          const patch = PatchParser.parse(buffer) as Patch;
          patch.filename = filename;
          return patch;
        }))),
        map(patch => {
          console.log(`x${patch.packageId.toString(16)}_${patch.patchId.toString(10)}`)
        })
      )
    ).pipe(takeLast(1)).toPromise();
  }

  getDatabase() {
    return patchDatabase.allDocs().then(entries => entries.rows.length > 0 ? patchDatabase : this.refresh());
  }
}
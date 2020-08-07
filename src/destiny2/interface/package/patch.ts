import { Region } from './region';
import { Entry } from './entry';
import { Block } from './block';

export class Patch {
  version: number;
  platform: number;
  packageId: number;
  buildDate: string;
  type: number;
  patchId: number;
  region: Region;
  buildString: number;
  entryCount: number;
  entryTableOffset: number;
  entries: Entry[];
  blockCount: number;
  blockTableOffset: number;
  blocks: Block[];
  filename?: string;
}

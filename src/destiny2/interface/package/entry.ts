import { RawFileType } from './type';

export class Entry {
  highType: RawFileType | string;
  lowType: RawFileType | string;
  startBlockIndex: number;
  startBlockByteIndex: number;
  blockCount: number;
  size: number;
}
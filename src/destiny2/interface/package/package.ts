import { Patch } from './patch';

export interface Package {
  id: number;
  patches: Patch[];
  filenames: string[];
}

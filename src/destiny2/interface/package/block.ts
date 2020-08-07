export interface Block {
  offset: number;
  size: number;
  patchId: number;
  flags: Flags;
  tag: Buffer;
}

export class Block {
  static readonly MAX_SIZE = 0x40000;
}

export interface Flags {
  compressed: boolean;
  encrypted: boolean;
  useAlternateKey: boolean;
}

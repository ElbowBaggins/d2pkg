import { Library } from 'ffi-napi';
import { refType, types } from 'ref-napi';

import { Block } from '../../interface/package/block';

const UCHAR_PTR = refType(types.uchar);
const VOID_PTR = refType(types.void);
const SUBPATH = 'bin\\x64\\oo2core_3_win64.dll';

export class Oodle {
  private oodleFFI: any;

  constructor(basePath: string) {
    this.oodleFFI = Library(`${basePath}${SUBPATH}`, {
      OodleLZ_Decompress: [
        types.int,
        [
          UCHAR_PTR,
          types.int,
          UCHAR_PTR,
          types.int,
          types.int,
          types.int,
          types.int,
          VOID_PTR,
          VOID_PTR,
          VOID_PTR,
          VOID_PTR,
          VOID_PTR,
          VOID_PTR,
          types.int,
        ],
      ],
    });
  }

  public decompress(buffer: Buffer): Buffer {
    // If Oodle actually behaves as appears to be documented,
    // these unsafe allocations should be 'safe'
    // because Oodle should not be attempting to read from
    // outBuffer at *any* point (and being a high-performance
    // compression engine it wouldn't make sense for it to do so anyway).
    //
    // Similarly, if Oodle is actually returning the number of decompressed
    // bytes correctly, any unsafe data will be overwritten before the Buffer is read.
    // If it is even remotely possible that the unsafe-allocated buffer returned from this
    // function could still contain unsafe data then an empty, safe-allocated, Buffer is
    // returned instead.
    //
    // Also, I have absolutely no idea what any of the arguments (beyond the first four) to
    // OodleLZ_Decompress actually do. They are allegedly all pointers but I really don't know.
    const outBuffer = Buffer.allocUnsafe(Block.MAX_SIZE);
    const actualBytes = this.oodleFFI.OodleLZ_Decompress(
      buffer, buffer.length, outBuffer, Block.MAX_SIZE, null, null, null, null, null, null, null, null, null, 3,
    );

    if (actualBytes === Block.MAX_SIZE) {
      return outBuffer;
    }

    const trimmedData = Buffer.allocUnsafe(actualBytes);
    const copiedBytes = outBuffer.copy(trimmedData, 0, 0, actualBytes);
    return (copiedBytes === actualBytes) ? trimmedData : Buffer.alloc(0);
  }
}

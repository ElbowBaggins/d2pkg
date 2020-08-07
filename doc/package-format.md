# Destiny 2 Package Format
Destiny 2's `.pkg` files follow a well-defined format. It is described here.

# Overview

Each `.pkg` file does not represent a whole `Package` but rather a slice of a `Package` called a `Patch`. The `id` of the `Package` and `Patch` can be determined by the layperson by examining the filename. For example, the file `w64_audio_01df_0.pkg` has a `Package.id` of `0x01df` and a `Patch.id` of `0`. Within each `Patch` there is an `Entry` table and a `Block` table.

Each `Entry` refers to a single actual file contained within the package. The `Entry` itself contains the index of the first `Block` in the `Block` table to contain data for this file, as well as an offset _into_ the binary data found in that block, and the total size of the file in bytes. (e.x. You start at block 30, byte 30, and read for 1024 bytes).

Each `Block` refers to a specific offset within the raw data of the `Patch` denoted by `Block.patchId` and `Block.size` denotes the size of the `Block`, in bytes. In other words, each `Block` table entry refers to an arbitrary-sized chunk of data that could be in _any_ of the `Patch` files for the current `Package` (but never outside the current `Package`).

Reassembling these chunks, in order, results in the original file.

All `Blocks` also have three flags that can be set, `Compressed`, `Encrypted`, and `AlternateKey`. A `Compressed` `Block` has its contents compressed with the Oodle compression library. Keep in mind that a `Compressed` AND `Encrypted` block must be decrypted _before_ attempting decompression. An `Encrypted` `Block` is, well, encrypted. The keys have leaked and are well-known. There are two keys. An `Encrypted` `Block` that also has the `AlternateKey` flag set is decrypted with the second key. Why? Who knows?! The encryption used is standard AES encryption. An `Encrypted` `Block` will also have a `Block.tag` property, containing a 16-byte buffer used as the AES 'AuthTag'. The AES 'IV' or 'Nonce' values is determined like so:

```javascript
const IV = Buffer.from([
  0x84 ^ (packageId >>> 8 & 0xFF),
  0xDF ^ 0x26,
  0x11,
  0xC0,
  0xAC,
  0xAB,
  0xFA,
  0x20,
  0x33,
  0x11,
  0x26,
  0x99 ^ (packageId & 0xFF)
]);
```

Keep in mind Compression and Encryption is performed at the `Block` level, not the `Entry` level. A `Compressed` and `Encrypted` `Block` must be decrypted and decompressed _before_ it joins the rest of the `Entry` content. An `Entry` _may_ be made up of many kinds of blocks, though I am not aware of any case where this happens such a case would not be invalid. If such an `Entry` exists in the future, this library should already be able to handle it.

As a side note, it appears that the Destiny 2 binary refers to this encryption scheme as 'fang'. (The string `'failed to fang'` appears near the string `'failed to decompress block'`) Neat.

# Data Structures
#### All Destiny 2 data is _Little-Endian_. This is **IMPORTANT!**
Considering that the `Package` itself is not really a data structure, the largest structure we encounter is, then, the `Patch`. Each file found in Destiny 2's `packages` directory is, in fact, a `Patch` file.

## Patch

Each `Patch` file contains three _known_ types of structure, in addition to swaths of data not yet understood.

Each `Patch` starts with a `Header` at byte 0. Its structure is as follows:

## Header

```C#
struct Header {
  uint16 version;
  uint16 platform;
  uint16 packageId;
  byte[10] unknown;
  uint32 buildDate; // 32-bit epoch, I think
  byte[6] unknown;
  PatchType type; // Enum, 0 for 'old' Patches, 1 for 'new' ones
  byte[4] unknown;
  uint16 patchId;
  Region region;
  byte[140] unknown;
  // The 'count' and '*tableOffset' entries seen here are only valid
  // for cases where Header.Type === Type.Original
  // New style packages use the 'TableHeader' object pointed to by
  // the last entry in the main header.
  uint32 entryCount; 
  uint32pointer<Entry[]> entryTableOffset;
  byte[20] unknown; // Actually an md5 hash of the Entry table
  uint32 blockCount;
  uint32pointer<Block[]> blockTableOffset;
  byte[20] unknown; // Actually an md5 hash of the Block table
  byte[52] unknown; // Actually another table structure?
  byte[4] unknown;
  // This is only used when Header.Type === Type.New
  // The above values are sometimes also correct, sometimes not.
  // Do not trust them.
  uint32pointer<TableHeader> tableHeaderOffset;
  byte[92] unknown;
}
```

New-style `Patch` files use the `TableHeader` structure instead of the `Entry` and `Block` table sizes/offsets present in the classic header. Such `Patch` files will have a pointer to this structure after the 'classic' data, as noted above.

The `TableHeader` and the structures it depends on, `PaddedEntryTable` and `PaddedBlockTable`, are as follows:
```C#
struct TableHeader {
  byte[16] unknown;
  uint32 entryCount;
  byte[4] unknown;
  uint32pointer<PaddedEntryTable> entryTableOffset;
  byte[4] unknown;
  uint32 blockCount;
  byte[4] unknown;
  uint32pointer<PaddedBlockTable> blockTableOffset;
}

// entryTableOffset = TableHeaderOffset + TableHeader.entryTableOffset + 40
struct PaddedEntryTable {
  byte[40] unknown;
  Entry[] entryTable; // Entry[0] starts immediately after unknown[39]
}

struct PaddedBlockTable {
  byte[56] unknown;
  Block[] blockTable; // Block[0] starts immediate after unknown[55]
}
```
The 40 and 56-byte pads preceding the tables in the new package format probably contains useful data, but the contents are not known as of this writing. The pad in the header is presumably to give them room to grow into 64-bit values.

The pointers in a `TableHeader` are relative to the start of the `TableHeader`. To get the true offset, the pointer to `TableHeader` is added to it.

## Entry
Each `Entry` is defined as follows
```C#
struct Entry {
  uint32 id;
  EntryType type;
  // The following four fields are packed into a uint64
  uint14 startBlockIndex; // 14 Bytes!
  uint14 startBlockByteIndex; // 14 Bytes again!
  uint28 size; // 28 byte value(?!), size of Entry in bytes
  byte unknown;
  // Here's how the above items are packed
  // uint64 packedEntryField;
  // uint16 startBlockIndex = packedEntryField >> 0x0 & 0x3FFF;
  // uint16 startBlockByteIndex = packedEntryField >> 0xE & 0x3FFF
  // uint32 size = packedEntryField >> 0x1C & 0x3FFFFFFF
  // uint8 unknown = packedEntryField >> 0x3A & 0x3F
  // Odd, yes?
}
```

## Block
Each `Block` is defined as follows
```C#
struct Block {
  uint32 offset;  // Block data begins at this offset in the Patch
  uint32 size;    // This many bytes are in the Block
  uint16 patchId; // The Block data is contained in this Patch.
  // The next four entries are packed into a byte
  // treat bits as booleans, 0 for false, 1 for true.
  bit[5] unused;
  bit alternateKey;
  bit encrypted;
  bit compressed;
  byte[20] unknown; // Actually an md5 hash, like the Entry table
  byte[16] tag; // AES authTag if Block is encrypted, otherwise junk
}
```

# Enums

#### Patch Type
```C#
enum PatchType {
  ORIGINAL = uint16(0x00),
  NEW = uint16(0x01)
}
```

#### Region
```C#
enum Region {
  OST = uint16(0x00),
  ENGLISH = uint16(0x01),
  FRENCH = uint16(0x02),
  ITALIAN = uint16(0x03),
  GERMAN = uint16(0x04),
  SPANISH_SP = uint16(0x05),
  JAPANESE = uint16(0x06),
  PORTUGUESE = uint16(0x07),
  RUSSIAN = uint16(0x08),
  POLISH = uint16(0x09),
  SPANISH_MX = uint16(0x0C),
  KOREAN = uint16(0x0D),
}
```

#### Entry Type
##### This was reverse-engineered from Ginsor's Audio Tool v2 and may not be 100% accurate. Be especially wary of the ranged values or pretty much anything that isn't Audio or VoiceLines.
```C#
enum EntryType {
  Image = AllUint32InRange(0x00025000->0x000250FF),
  ImageReference = AllUint32InRange(0x00040000->0x000400FF),
  ImageCombiner = uint32(0x80804A69),
  ImageCombinerReference = uint32(0x80804A53),
  Audio = uint32(0x0001359C),
  AudioBlockHeader = uint32(0x0000355C),
  ModelMaster = uint32(0x808073A5),
  ModelFaces = AllUint32InRange(0x0002518A->0x00025199),
  ModelFacesReference = AllUint32InRange(0x000048A->0x0000499),
  ModelVertices = AllUint32InRange(0x0002510A->0x00025119),
  ModelVerticesReference = AllUint32InRange(0x0000410A->0x00004119),
  ModelMiscellaneous = AllUint32InRange(0x00025194->0x000251DA),
  ModelMiscellaneousReference = AllUint32InRange(0x00004194->0x000041DA),
  DirectXShaderBytecode = AllUint32InRange(0x0002520A->0x0002529A),
  DirectXShaderBytecodeReference = AllUint32InRange(0x0000420A->0x0000429A),
  DirectXShaderBytecodeChunk = uint32(0x0002539A),
  DirectXShaderBytecodeChunkReference = uint32(0x000439A),
  HavokData = AllUint32InRange(0x000035D4->0x000035D9),
  HavokDataReference = uint32(0x8080727A),
  Filename = AllUint32InRange(0x8080816C->0x8080941E),
  FilenameReference = uint32(0x8080744A),
  Map = uint32(0x00003012),
  VoiceLines = uint32(0x8080D54)
}
```

# Additional Info
Destiny 2's internal audio files are `.wem` files. They are compressed with the Audiokinetic Wwise codec. This project internally uses [jangxx/node-wwriff](http://www.github.com/jangxx/node-wwriff) to convert these to a stream of `ogg_packet` instances, which are combined into proper Ogg Vorbis files via the Ogg encoder provided by [TooTallNate/node-ogg](http://www.github.com/TooTallNate/node-ogg).

# Credits/Dependencies
This would not have been possible without help from the following great open-source projects

- [keichi/binary-parser](http://www.github.com/keichi/binary-parser) - This excellent library made reading the package files _pretty damn easy_. If you have a C-struct (or similar) that you need to parse in Node, this is absolutely the tool for you.
- [node-ffi-napi/node-ffi-napi](http://www.github.com/node-ffi-napi/node-ffi-napi) - _This_ excellent library made it **dead** simple to call the Oodle decompression functions with nothing more than the path to the DLL, the name of the function, the parameter types, and the return type. All from the comfort of JS!
- [jangxx/node-wwriff](http://www.github.com/jangxx/node-wwriff) - Converts a `.wem` file stream to a stream of `ogg_packet` instances. (I also am a contributor to this project!)
  - [TooTallNate/node-ogg-packet](http://www.github.com/TooTallNate/ogg-packet) - Provides the `ogg_packet` definition
    - [TooTallNate/ref-struct](http://www.github.com/TooTallNate/ref-struct) - Provides native bindings
- [TooTallNate/node-ogg](http://www.github.com/TooTallNate/node-ogg) - Encodes a stream of `ogg_packet` instances into a proper `.ogg` file.

Special thanks also go to 'Sir Kane' for providing the _original_ Destiny 2 file extractor on [ZenHax](https://zenhax.com/viewtopic.php?f=9&t=4823&start=20#p31287) and to [Ginsor](http://www.twitter.com/GinsorKR) for adapting _that_ research into Ginsor's Audio Tool v1 and v2, the decompilations of which revealed several otherwise-yet-unknown data structures within the package format. 
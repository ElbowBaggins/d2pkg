// tslint:disable: only-arrow-functions object-literal-shorthand no-eval
// Arrow functions and the literal shorthand do not play nice with binary-parser.
import { Parser } from 'binary-parser';
import { Patch } from '../interface/package/patch';
import { Block } from '../interface/package/block';
import { RawFileTypeName, RawFileTypeToContentType, ContentTypeName } from '../interface/package/type';
import moment from 'moment';

const EntryParser = Parser
.start()
.endianess('little')
.uint32('highType', {
  formatter: function (value) {
    const result = this.RawFileTypeName(value);
    return !!result ? result : 'Unclassified';
  }
})
.uint32('lowType', {
  formatter: function (value) {
    const result = this.ContentTypeName(this.RawFileTypeToContentType(value));
    return !!result ? result : 'Unclassified';
  }
})
.uint64('startBlockIndex', { formatter: function(value) { return Number(value >> 0x0n & 0x3FFFn); }})
.seek(-8)
.uint64('startBlockByteIndex', { formatter: function(value) { return Number(value >> 0xEn & 0x3FFFn) * 0x10; }})
.seek(-8)
.uint64('size', { formatter: function(value) { return Number(value >> 0x1Cn & 0x3FFFFFFFn); }})
.seek(-8)
.uint64(
  'blockCount',
  {
    formatter: function(value) {
      const startBlockByteIndex = Number(value >> 0xEn & 0x3FFFn) * 0x10;
      const size = Number(value >> 0x1Cn & 0x3FFFFFFFn);
      return Math.floor((startBlockByteIndex + size + this.MAX_BLOCK_SIZE - 1) / this.MAX_BLOCK_SIZE);
    }
  }
);

const BlockParser = Parser
.start()
.endianess('little')
.uint32('offset')
.uint32('size')
.uint16('patchId')
.nest('flags', {
  type: Parser
  .start()
  .endianess('little')
  .uint16('alternateKey', { formatter: function(value) { return !!(value & 0x04); }})
  .seek(-2)
  .uint16('encrypted', { formatter: function(value) { return !!(value & 0x02); }})
  .seek(-2)
  .uint16('compressed', { formatter: function(value) { return !!(value & 0x01); }})
})
.skip(20) // Skip hash
.buffer('tag', {
  length: 16,
});

export const PatchParser: Parser<Patch> = Parser
.start()
.endianess('little')
.uint16('version')
.uint16('platform')
.uint16('packageId')
.seek(10) // Skip 10 bytes of unknown fields
.uint32('buildDate', {
  formatter: function(value) {
    return this.moment.unix(value).format();
  }
})
.seek(6)  // Skip 6 bytes of unknown fields
.uint16('type')
.seek(4)
.uint16('patchId')
.uint16('region')
.uint32('buildString')
.seek(136)  // Skip 136 bytes of unknown fields
.seek(4)    // Skip signatureOffset
.uint32('entryCount')
.uint32('entryTableOffset')
.seek(20)   // Skip Entry Table hash
.uint32('blockCount')
.uint32('blockTableOffset')
.seek(20) // Skip Block Table hash
.seek(32) // Skip unknown table
.seek(4)  // Skip unused value
.uint32('tableHeaderOffset', {
  formatter: function(value) {
    return this.type === 0 ? -1 : value;
  }
})
.seek(92) // There are 92 bytes after the tableHeaderOffset, this symbolically and pointlessly consumes them

// We're done reading header values at this point, so we're going to jump to the offsets we found and parse Entries and Blocks
// Save the current offset, jump to the Entry Table offset, parse Entries.
// For new style patches this will be empty, in which case it will be replaced with a populated array later
.saveOffset('currentOffset')
.seek(function() { return (-this.currentOffset) + this.entryTableOffset; })
.array('entries', {
  type: EntryParser,
  length: 'entryCount'
})

// Do the same for Blocks
.saveOffset('currentOffset')
.seek(function() { return (-this.currentOffset) + this.blockTableOffset; })
.array('blocks', {
  type: BlockParser,
  length: 'blockCount'
})
// Fold the TableHeader into the overall header since we don't actually care about the distinction
.saveOffset('currentOffset')
.seek(function() { return (-this.currentOffset) + Math.max(0, this.tableHeaderOffset); })
.choice(null, {
  tag: 'type',
  choices: {
    0: Parser.start().endianess('little').create(function Empty() {}),
    1: Parser
    .start()
    .endianess('little')
    .seek(16)
    .uint32('entryCount')
    .seek(4)
    .uint32('entryTableOffset', { formatter: function(value) { return value + 0x28; } })
    .seek(4)
    .uint32('blockCount')
    .seek(4)
    .uint32('blockTableOffset', { formatter: function(value) { return value + 0x38; }})
    .seek(-44) // Rewind
    .seek('entryTableOffset')
    .array('entries', {
      type: EntryParser,
      length: 'entryCount'
    })
    .seek(function() { return ((-this.entryCount * 16) - this.entryTableOffset); }) // Rewind
    .seek('blockTableOffset')
    .array('blocks', {
      type: BlockParser,
      length: 'blockCount'
    })
  }
});
PatchParser.moment = moment;
PatchParser.RawFileTypeName = RawFileTypeName;
PatchParser.RawFileTypeToContentType = RawFileTypeToContentType;
PatchParser.ContentTypeName = ContentTypeName;
PatchParser.MAX_BLOCK_SIZE = Block.MAX_SIZE;

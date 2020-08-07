export enum Region {
  OST = 0,
  ENGLISH = 1,
  FRENCH = 2,
  ITALIAN = 3,
  GERMAN = 4,
  SPANISH_SP = 5,
  JAPANESE = 6,
  PORTUGUESE = 7,
  RUSSIAN = 8,
  POLISH = 9,
  SPANISH_MX = 12,
  KOREAN = 13,
}

export const HashOffsets = {};
HashOffsets[Region.ENGLISH] = 0x18;
HashOffsets[Region.FRENCH] = 0x24;
HashOffsets[Region.ITALIAN] = 0x30;
HashOffsets[Region.GERMAN] = 0x20;
HashOffsets[Region.SPANISH_SP] = 0x28;
HashOffsets[Region.JAPANESE] = 0x18;
HashOffsets[Region.PORTUGUESE] = 0x40;
HashOffsets[Region.RUSSIAN] = 0x18;
HashOffsets[Region.POLISH] = 0x18;
HashOffsets[Region.SPANISH_MX] = 0x2C;
HashOffsets[Region.KOREAN] = 0x18;

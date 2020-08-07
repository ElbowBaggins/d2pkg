import { createDecipheriv } from 'crypto';

const DANCE_PARTY = Buffer.from([0xD6, 0x2A, 0xB2, 0xC1, 0x0C, 0xC0, 0x1B, 0xC5, 0x35, 0xDB, 0x7B, 0x86, 0x55, 0xC7, 0xDC, 0x3B]);
const BLACK_ARMORY = Buffer.from([0x3A, 0x4A, 0x5D, 0x36, 0x73, 0xA6, 0x60, 0x58, 0x7E, 0x63, 0xE6, 0x76, 0xE4, 0x08, 0x92, 0xB5]);
const MYSTERIOUS_BOX = [0x84, 0xDF, 0x11, 0xC0, 0xAC, 0xAB, 0xFA, 0x20, 0x33, 0x11, 0x26, 0x99];

const generatePackageIV = (packageId: number): Buffer => {
  const iv = MYSTERIOUS_BOX.slice();
  iv[0] ^= (packageId >>> 8 & 0xFF);
  iv[1] ^= 0x26;
  iv[11] ^= (packageId & 0xFF);
  return Buffer.from(iv);
};

export const AES = {
  decrypt(buffer: Buffer, packageId: number, tag: Buffer, alternate: boolean): Buffer {
    const decipher = createDecipheriv('aes-128-gcm', alternate ? BLACK_ARMORY : DANCE_PARTY, generatePackageIV(packageId));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  },
};

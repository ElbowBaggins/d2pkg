import Bluebird from 'bluebird';
import * as fs from 'fs-extra';
import { Decoder } from 'node-wwriff';
import { Encoder } from '@suldashi/ogg';
import { CODEBOOKS } from './codebook';

export const WEM = {
  decode(buffer: Buffer): Promise<Buffer> {
    return new Bluebird.Promise((resolve) => {
      const encoder = new Encoder();
      const decoder = new Decoder();
      decoder.setCodebookFromBuffer(CODEBOOKS);
      fs.writeFileSync('D:\\D2Out\\temp.bin', buffer);
      const readStream = fs.createReadStream('D:\\D2Out\\temp.bin');
      readStream.pipe(decoder).pipe(encoder.stream());
      const writeStream = fs.createWriteStream('D:\\D2Out\\result.ogg');
      encoder.pipe(writeStream);
      writeStream.on('finish', () => resolve(fs.readFileSync('D:\\D2Out\\result.ogg') as Buffer));
    });
  },
};
export default WEM;

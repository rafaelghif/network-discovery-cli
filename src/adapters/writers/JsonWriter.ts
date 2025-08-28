import fs from 'fs/promises';
import path from 'path';
import { IWriter } from './IWriter.js';

export class JsonWriter implements IWriter {
  async write(data: any, filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }
}
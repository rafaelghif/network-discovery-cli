export interface IWriter {
  write(data: any, filePath: string): Promise<void>;
}
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import { IWriter } from './IWriter.js';

export class ExcelWriter implements IWriter {
  async write(data: any[], filePath: string): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }
    
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ports');
      
      const colWidths = Object.keys(data[0]).map(key => ({
          wch: data.reduce((w, r) => Math.max(w, (r[key]?.toString().length || 0), key.length), 10)
      }));
      worksheet['!cols'] = colWidths;
  
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // *** THIS IS THE CRITICAL CHANGE ***
      // 1. Generate the XLSX file content as a buffer in memory instead of writing directly to disk.
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // 2. Write that buffer to the file system using Node's native, more reliable fs module.
      // If this fails, it will give us a REAL system error code (EPERM, EBUSY, etc.).
      await fs.writeFile(filePath, buffer);
      // *** END OF CHANGE ***

    } catch (error: any) {
      // This will now catch the true, low-level file system error.
      throw new Error(`[ExcelWriter] Failed to write XLSX file at ${filePath}. Original error: ${error.message}`);
    }
  }
}
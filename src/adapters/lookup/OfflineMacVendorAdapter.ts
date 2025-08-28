import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { IMacVendorResolver } from './MacVendorAdapter.js';
import logger from '../../infrastructure/Logger.js';
import { eventBus } from '../../infrastructure/EventBus.js';

export class OfflineMacVendorAdapter implements IMacVendorResolver {
  private static vendorMap: Map<string, string> | null = null;
  // UPDATED: Point to the new oui.txt database file
  private static readonly filePath = path.join('assets', 'oui.txt');

  public static async initialize(): Promise<void> {
    if (this.vendorMap) return; // Already initialized

    eventBus.publish('ui:updateStatus', { text: `Loading offline MAC vendor database (IEEE)...` });

    this.vendorMap = new Map<string, string>();

    if (!fs.existsSync(this.filePath)) {
      logger.error(`Offline MAC database not found at ${this.filePath}. Please download it.`);
      return;
    }

    const fileStream = fs.createReadStream(this.filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    // UPDATED: New parsing logic for the oui.txt format
    const hexLineRegex = /^([0-9A-F]{2}-[0-9A-F]{2}-[0-9A-F]{2})\s+\(hex\)\s+(.*)$/;

    for await (const line of rl) {
      const match = line.match(hexLineRegex);
      if (match) {
        // match[1] is the OUI (e.g., "00-00-0C")
        // match[2] is the Vendor Name (e.g., "Cisco Systems, Inc")
        const oui = match[1].replace(/-/g, '');
        const vendorName = match[2].trim();
        if (oui && vendorName) {
          this.vendorMap.set(oui, vendorName);
        }
      }
    }
    eventBus.publish('ui:updateStatus', { text: `Offline MAC database loaded.` });
  }

  public async resolve(macAddress: string): Promise<string> {
    if (!OfflineMacVendorAdapter.vendorMap) {
      throw new Error('Offline MAC vendor resolver has not been initialized.');
    }

    // OUI is the first 6 characters of the MAC address
    const oui = macAddress.replace(/[:.-]/g, '').substring(0, 6).toUpperCase();

    return OfflineMacVendorAdapter.vendorMap.get(oui) || 'Unknown Vendor';
  }
}
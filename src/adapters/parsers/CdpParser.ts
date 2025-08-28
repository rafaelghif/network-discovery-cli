import { Neighbor } from '../../domain/Neighbor.js';
import { normalizeInterfaceName } from './common.js';

export class CdpParser {
  static parse(output: string): Neighbor[] {
    const neighbors: Neighbor[] = [];
    const entries = output.split('-------------------------');

    for (const entry of entries) {
      if (!entry.trim()) continue;

      const deviceIdMatch = entry.match(/Device ID:\s*(.+)/);
      const localIntMatch = entry.match(/Interface:\s*([^,]+),/);
      const remoteIntMatch = entry.match(/Port ID \(outgoing port\):\s*(.+)/);
      const platformMatch = entry.match(/Platform:\s*([^,]+),/);
      
      if (deviceIdMatch && localIntMatch && remoteIntMatch) {
        neighbors.push(new Neighbor(
          normalizeInterfaceName(localIntMatch[1].trim()),
          deviceIdMatch[1].trim(),
          normalizeInterfaceName(remoteIntMatch[1].trim()),
          platformMatch ? platformMatch[1].trim() : 'N/A'
        ));
      }
    }
    return neighbors;
  }
}
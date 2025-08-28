import { Neighbor } from '../../domain/Neighbor.js';
import { normalizeInterfaceName } from './common.js';

export class LldpParser {
  static parse(output: string): Neighbor[] {
    const neighbors: Neighbor[] = [];
    const entries = output.split(/Local Intf:|Local Interface:/);

    for (const entry of entries) {
      if (!entry.trim() || !entry.includes('Port id:')) continue;
      
      const lines = entry.trim().split('\n');
      const localPort = normalizeInterfaceName(lines[0].trim());

      let deviceId: string | undefined;
      let remotePort: string | undefined;
      let platform: string | undefined;

      for (const line of lines) {
        if (line.includes('Chassis id:')) deviceId = line.split(':').slice(1).join(':').trim();
        if (line.includes('Port id:')) remotePort = line.split(':').slice(1).join(':').trim();
        if (line.includes('System Description:')) platform = line.split('System Description:')[1].trim().split('\n')[0];
      }
      
      if (localPort && deviceId && remotePort) {
        neighbors.push(new Neighbor(
          localPort,
          deviceId,
          normalizeInterfaceName(remotePort),
          platform?.substring(0, 40) || 'N/A' // Keep platform info concise
        ));
      }
    }
    return neighbors;
  }
}
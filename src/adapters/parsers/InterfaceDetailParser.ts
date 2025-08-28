import { Interface } from '../../domain/Interface.js';
import { PoeStatus, PortMode } from '../../shared/types.js';

export class InterfaceDetailParser {
  static parseSwitchport(output: string): Partial<Interface> {
    const modeMatch = output.match(/Administrative Mode:\s*(.*?)$/m);
    const accessVlanMatch = output.match(/Access Mode VLAN:\s*(\d+)/m);
    const trunkVlansMatch = output.match(/Trunking VLANs Enabled:\s*(.*?)$/m);

    let mode: PortMode = 'N/A';
    if (modeMatch) {
        if (modeMatch[1].includes('trunk')) mode = 'trunk';
        else if (modeMatch[1].includes('static access')) mode = 'access';
    }

    return {
      mode,
      accessVlan: accessVlanMatch ? accessVlanMatch[1] : 'N/A',
      trunkVlans: trunkVlansMatch ? trunkVlansMatch[1].replace(' ALL', '1-4094') : 'N/A',
    };
  }

  static parsePoe(output: string): Partial<Interface> {
      let poeStatus: PoeStatus = 'N/A';
      if (/auto/i.test(output)) poeStatus = 'Auto';
      if (/off/i.test(output)) poeStatus = 'off';
      if (/faulty/i.test(output)) poeStatus = 'faulty';
      
      return { poeStatus };
  }
}
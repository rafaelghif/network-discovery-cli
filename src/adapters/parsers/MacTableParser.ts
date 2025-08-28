export class MacTableParser {
  static parse(output: string): string[] {
    const macAddresses: string[] = [];
    const lines = output.split('\n');
    
    // Regex for modern format: VLAN  Mac Address       Type        Ports
    const regexModern = /^\s*\d+\s+([0-9a-fA-F.]+)\s+\w+\s+\S+/;
    // Regex for legacy format: Mac Address Table ... Address ... Port
    const regexLegacy = /^\s*([0-9a-fA-F.]+)\s+\w+\s+\S+/;

    for (const line of lines) {
      const matchModern = line.match(regexModern);
      if (matchModern) {
        macAddresses.push(matchModern[1]);
        continue;
      }
      const matchLegacy = line.match(regexLegacy);
      if (matchLegacy) {
        macAddresses.push(matchLegacy[1]);
      }
    }
    return macAddresses.map(mac => mac.replace(/\./g, '').toLowerCase());
  }
}
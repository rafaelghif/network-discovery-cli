import { Interface } from "../../domain/Interface.js";
import { normalizeInterfaceName } from "./common.js";
import { PortStatus } from "../../shared/types.js";

export class InterfaceStatusParser {
  static parse(output: string): Partial<Interface>[] {
    const interfaces: Partial<Interface>[] = [];
    const lines = output.split("\n").slice(1); // Skip header

    // Regex for standard "show interface status"
    const standardRegex =
      /^(?<port>\S+)\s+(?<desc>.*?)\s+(?<status>connected|notconnect|disabled|err-disabled|inactive)\s+/;
    // Regex for Cisco SMB "show interface description"
    const smbRegex =
      /^(?<port>gi\d+|fa\d+)\s+(?:Up|Down)\s+\S+\s+\S+\s+\S+\s+(?<desc>.*)$/;

    for (const line of lines) {
      const standardMatch = line.match(standardRegex);
      if (standardMatch?.groups) {
        interfaces.push({
          portName: normalizeInterfaceName(standardMatch.groups.port),
          description: standardMatch.groups.desc.trim() || "N/A",
          status: standardMatch.groups.status as PortStatus,
        });
        continue;
      }

      const smbMatch = line.match(smbRegex);
      if (smbMatch?.groups) {
        interfaces.push({
          portName: normalizeInterfaceName(smbMatch.groups.port),
          description: smbMatch.groups.desc.trim() || "N/A",
          // SMB status is less direct, we'd need 'show int' for full status
          status: line.includes(" Up ") ? "connected" : "notconnect",
        });
      }
    }
    return interfaces;
  }
}

import { DevicePlatform } from '../../shared/types.js';

export class IdentityParser {
  static parseHostname(showRunOutput: string): string {
    const match = showRunOutput.match(/^hostname\s+(.+)$/m);
    return match ? match[1].trim() : 'UnknownHostname';
  }

  // NEW: Parses hostname from a prompt like "MySwitch#"
  static parseHostnameFromPrompt(prompt: string): string {
    if (!prompt) return 'UnknownHostname';
    const match = prompt.match(/^(.*)(>|#)/);
    return match ? match[1].trim() : 'UnknownHostname';
  }

  // NEW: Parses hostname from "show version" output
  static parseHostnameFromShowVersion(output: string): string {
    const match = output.match(/^(.+)\s+uptime is/im);
    return match ? match[1].trim() : 'UnknownHostname';
  }

  static parsePlatform(showVersionOutput: string): DevicePlatform {
    if (/Cisco IOS Software, C2960S Software/i.test(showVersionOutput) || /IOS XE Software/i.test(showVersionOutput)) {
      return 'IOS-XE';
    }
    if (/Cisco IOS Software/i.test(showVersionOutput)) {
      return 'IOS';
    }
    if (/Cisco Nexus Operating System \(NX-OS\) Software/i.test(showVersionOutput)) {
      return 'NX-OS';
    }
    if (/SW-Version/i.test(showVersionOutput) && /(SG\d+|SF\d+)/i.test(showVersionOutput)) {
      return 'SMB';
    }
    return 'Unknown';
  }
}
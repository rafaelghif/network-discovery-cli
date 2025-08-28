import path from 'path';
import { CliOptions } from '../adapters/cli/schemas.js';
import { SshAdapter } from '../adapters/transports/SshAdapter.js';
import { ITransport, CommandResult } from '../adapters/transports/ITransport.js';
import { TelnetAdapter } from '../adapters/transports/TelnetAdapter.js';
import { SerialAdapter } from '../adapters/transports/SerialAdapter.js';
import { IWriter } from '../adapters/writers/IWriter.js';
import { Device } from '../domain/Device.js';
import { CommandOutput, DevicePlatform } from '../shared/types.js';
import { eventBus } from '../infrastructure/EventBus.js';
import logger from '../infrastructure/Logger.js';
import { sanitizeFilename } from '../shared/utils.js';
import { IdentityParser } from '../adapters/parsers/IdentityParser.js';
import { InterfaceStatusParser } from '../adapters/parsers/InterfaceStatusParser.js';
import { CdpParser } from '../adapters/parsers/CdpParser.js';
import { LldpParser } from '../adapters/parsers/LldpParser.js';
import { InterfaceDetailParser } from '../adapters/parsers/InterfaceDetailParser.js';
import { MacTableParser } from '../adapters/parsers/MacTableParser.js';

export class DiscoveryService {
  private rawOutputs = new Map<string, CommandOutput[]>();

  constructor(
    private options: CliOptions,
    private jsonWriter: IWriter,
    private excelWriter: IWriter,
  ) { }

  public async run(): Promise<void> {
    const targets = this.options.mode === 'Serial'
      ? [this.options.comPort!]
      : this.options.targets!.split(',').map(t => t.trim());

    eventBus.publish('discovery:start', { total: targets.length });

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const target of targets) {
      processedCount++;
      eventBus.publish('ui:updateStatus', {
        text: `Processing device ${processedCount}/${targets.length}: ${target}`
      });

      try {
        const deviceData = await this.discoverDevice(target);
        await this.writeData(deviceData);
        successCount++;
        eventBus.publish('device:success', { target, hostname: deviceData.hostname });
      } catch (error: any) {
        errorCount++;
        eventBus.publish('device:fail', { target, error: error.message });
        logger.error(`[DiscoveryService] CRITICAL FAILURE processing ${target}. Full error stack:`, error);
      }
    }
    eventBus.publish('discovery:complete', { success: successCount, errors: errorCount });
  }

  private async discoverDevice(target: string): Promise<Device> {
    let transport: ITransport;

    switch (this.options.mode) {
      case 'Telnet':
        transport = new TelnetAdapter({ ...this.options.credentials, host: target, timeout: this.options.timeout });
        break;
      case 'Serial':
        transport = new SerialAdapter({ ...this.options.credentials, comPort: target, timeout: this.options.timeout, baudRate: this.options.baudRate, debug: this.options.debug });
        break;
      case 'SSH':
      default:
        transport = new SshAdapter({ ...this.options.credentials, host: target, legacySsh: this.options.legacySsh, timeout: this.options.timeout });
        break;
    }

    const commandOutputs: CommandOutput[] = [];

    const execute = async (command: string): Promise<CommandResult> => {
      try {
        const result = await transport.executeCommand(command);
        commandOutputs.push({ command, output: result.output });
        return result;
      } catch (e: any) {
        commandOutputs.push({ command, output: `ERROR: ${e.message}` });
        logger.warn(`Command '${command}' failed on ${target}: ${e.message}`);
        return { output: '', prompt: '' };
      }
    };

    try {
      await transport.connect();
      if (this.options.credentials.enableSecret) {
        await transport.enable(this.options.credentials.enableSecret);
      }

      let hostname = 'UnknownHostname';
      let lastPrompt = '';

      const showRunResult = await execute('show run | i ^hostname');
      hostname = IdentityParser.parseHostname(showRunResult.output);
      lastPrompt = showRunResult.prompt;

      if (hostname === 'UnknownHostname' && lastPrompt) {
        hostname = IdentityParser.parseHostnameFromPrompt(lastPrompt);
      }

      const showVerResult = await execute('show version');
      if (hostname === 'UnknownHostname') {
        hostname = IdentityParser.parseHostnameFromShowVersion(showVerResult.output);
      }

      const platform = IdentityParser.parsePlatform(showVerResult.output);
      const device = new Device(hostname, platform);

      const intStatusResult = await execute(this.getCommand('show interfaces status', platform));
      const initialPorts = InterfaceStatusParser.parse(intStatusResult.output); // FIXED
      initialPorts.forEach(p => device.addOrUpdateInterface(p));

      const cdpResult = await execute('show cdp neighbors detail');
      device.addCdpNeighbors(CdpParser.parse(cdpResult.output)); // FIXED

      const lldpResult = await execute('show lldp neighbors detail');
      device.addLldpNeighbors(LldpParser.parse(lldpResult.output)); // FIXED

      for (const iface of device.interfaces.values()) {
        eventBus.publish('ui:updateStatus', {
          text: `Fetching details for ${iface.portName} on ${hostname}`
        });

        const switchportResult = await execute(`show interface ${iface.portName} switchport`);
        device.addOrUpdateInterface({ portName: iface.portName, ...InterfaceDetailParser.parseSwitchport(switchportResult.output) }); // FIXED

        const macTableResult = await execute(`show mac address-table interface ${iface.portName}`);
        iface.macAddresses = MacTableParser.parse(macTableResult.output); // FIXED

        const poeResult = await execute(`show power inline ${iface.portName}`);
        device.addOrUpdateInterface({ portName: iface.portName, ...InterfaceDetailParser.parsePoe(poeResult.output) }); // FIXED
      }

      device.processAndMergeNeighbors();

      if (this.options.debug) {
        this.rawOutputs.set(hostname, commandOutputs);
      }

      return device;
    } finally {
      transport.disconnect();
    }
  }

  private getCommand(baseCommand: string, platform: DevicePlatform): string {
    if (platform === 'SMB' && baseCommand === 'show interfaces status') {
      return 'show interface description';
    }
    return baseCommand;
  }

  private async writeData(device: Device): Promise<void> {
    const safeHostname = sanitizeFilename(device.hostname);
    const outputDir = path.join('output', safeHostname);
    const flatData = device.toFlatObject();

    await this.jsonWriter.write(flatData, path.join(outputDir, 'ports.json'));
    await this.excelWriter.write(flatData, path.join(outputDir, 'ports.xlsx'));

    if (this.options.debug) {
      const rawDir = path.join(outputDir, 'raw');
      const rawData = this.rawOutputs.get(device.hostname);
      if (rawData) {
        await this.jsonWriter.write(rawData, path.join(rawDir, 'commands.json'));
      }
    }
  }
}
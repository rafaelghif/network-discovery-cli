import { Interface } from './Interface.js';
import { Neighbor } from './Neighbor.js';
import { NeighborMergingService } from './NeighborMergingService.js';
import { DevicePlatform } from '../shared/types.js';

export class Device {
  public interfaces = new Map<string, Interface>();

  constructor(public hostname: string, public platform: DevicePlatform) { }

  addOrUpdateInterface(portData: Partial<Interface>): void {
    if (!portData.portName) return;
    let iface = this.interfaces.get(portData.portName);
    if (!iface) {
      iface = new Interface(portData.portName);
      this.interfaces.set(portData.portName, iface);
    }
    Object.assign(iface, portData);
  }

  addCdpNeighbors(neighbors: Neighbor[]): void {
    this.addNeighbors(neighbors, 'CDP');
  }

  addLldpNeighbors(neighbors: Neighbor[]): void {
    this.addNeighbors(neighbors, 'LLDP');
  }

  private addNeighbors(neighbors: Neighbor[], protocol: 'CDP' | 'LLDP'): void {
    for (const neighbor of neighbors) {
      const iface = this.interfaces.get(neighbor.localPort);
      if (iface) {
        if (protocol === 'CDP') {
          iface.cdpNeighbor = neighbor;
        } else {
          iface.lldpNeighbor = neighbor;
        }
      }
    }
  }

  processAndMergeNeighbors(): void {
    const merger = new NeighborMergingService();
    for (const iface of this.interfaces.values()) {
      merger.merge(iface);
    }
  }

  toFlatObject(): any[] {
    const flatData: any[] = [];
    for (const iface of this.interfaces.values()) {
      flatData.push({
        switchhost: this.hostname,
        portname: iface.portName,
        port_description: iface.description,
        portStatus: iface.status,
        mode: iface.mode,
        access_vlan: iface.accessVlan,
        trunk_vlans: iface.trunkVlans,
        poe_status: iface.poeStatus,
        mac_count: iface.macAddresses.length,
        mac_lists: iface.macAddressDetails.length > 0
          ? iface.macAddressDetails.map(m => `${m.mac} (${m.vendor})`).join(', ')
          : iface.macAddresses.join(', '),
        neighbor_device: iface.mergedNeighbor?.deviceId,
        neighbor_port: iface.mergedNeighbor?.portId,
        neighbor_platform: iface.mergedNeighbor?.platform,
        neighbor_source: iface.mergedNeighbor?.sourceProtocol,
      });
    }
    return flatData;
  }
}
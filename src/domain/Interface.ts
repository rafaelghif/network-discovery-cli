import { PortMode, PortStatus, PoeStatus } from '../shared/types.js';
import { Neighbor } from './Neighbor.js';

export class Interface {
  description: string = 'N/A';
  status: PortStatus = 'notconnect';
  mode: PortMode = 'N/A';
  accessVlan: string = 'N/A';
  trunkVlans: string = 'N/A';
  poeStatus: PoeStatus = 'N/A';
  macAddresses: string[] = [];

  cdpNeighbor?: Neighbor;
  lldpNeighbor?: Neighbor;
  mergedNeighbor?: Neighbor & { sourceProtocol: 'CDP' | 'LLDP' | 'Both' };

  constructor(public portName: string) {}
}
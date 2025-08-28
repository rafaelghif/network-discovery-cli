import { Interface } from './Interface.js';

export class NeighborMergingService {
  /**
   * Merges CDP and LLDP neighbor data for an interface, with CDP taking precedence.
   */
  merge(iface: Interface): void {
    if (iface.cdpNeighbor && iface.lldpNeighbor) {
      // CDP has precedence as per requirements
      iface.mergedNeighbor = { ...iface.cdpNeighbor, sourceProtocol: 'CDP' };
    } else if (iface.cdpNeighbor) {
      iface.mergedNeighbor = { ...iface.cdpNeighbor, sourceProtocol: 'CDP' };
    } else if (iface.lldpNeighbor) {
      iface.mergedNeighbor = { ...iface.lldpNeighbor, sourceProtocol: 'LLDP' };
    }
  }
}
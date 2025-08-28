export type PortStatus = 'connected' | 'notconnect' | 'disabled' | 'err-disabled' | 'inactive' | 'other';
export type PortMode = 'access' | 'trunk' | 'routed' | 'N/A';
export type PoeStatus = 'Auto' | 'off' | 'faulty' | 'N/A';

export type DevicePlatform = 'IOS' | 'IOS-XE' | 'NX-OS' | 'SMB' | 'Unknown';

export interface CommandOutput {
  command: string;
  output: string;
}

export type EventType = 'discovery:start' | 'discovery:complete' | 'device:start' | 'device:success' | 'device:fail' | 'ui:updateStatus';
export type EventPayload = { [key: string]: any };
export type EventListener = (payload: EventPayload) => void;
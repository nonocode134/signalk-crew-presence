export interface CrewMember {
  name: string;
  macAddress: string;
}

export interface PluginConfig {
  crewMembers: CrewMember[];
  alarmTimeoutSeconds: number;
}

export interface BleDevice {
  mac: string;
  name: string | null;
  rssi: number;
  lastSeen: number;
}

export interface PresenceEntry {
  member: CrewMember;
  present: boolean;
  lastSeen: number | null;
  alarming: boolean;
}

export interface SignalKApp {
  handleMessage(pluginId: string, delta: unknown): void;
  setPluginStatus(message: string): void;
  setPluginError(message: string): void;
  debug(message: string): void;
  error(message: string): void;
  use(path: string, router: unknown): void;
  savePluginOptions(options: unknown, callback: (err: Error | null) => void): void;
}

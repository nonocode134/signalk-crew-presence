import { EventEmitter } from 'events';
import { BleDevice, CrewMember, PluginConfig, PresenceEntry } from './types';
import { RawDevice } from './ble-scanner';

const DEVICE_TTL_MS = 5 * 60 * 1000;

export class PresenceMonitor extends EventEmitter {
  private detectedDevices = new Map<string, BleDevice>();
  private presenceState = new Map<string, PresenceEntry>();
  private config: PluginConfig | null = null;
  private armed = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  onDevice(raw: RawDevice): void {
    const now = Date.now();
    const existing = this.detectedDevices.get(raw.mac);
    this.detectedDevices.set(raw.mac, {
      mac: raw.mac,
      name: raw.name ?? existing?.name ?? null,
      rssi: raw.rssi,
      lastSeen: now,
    });

    if (!this.armed || !this.config) return;

    const entry = this.presenceState.get(raw.mac);
    if (!entry) return;

    const wasAlarming = entry.alarming;
    entry.present = true;
    entry.lastSeen = now;
    entry.alarming = false;

    if (wasAlarming) {
      this.emit('clear', entry.member);
    }
  }

  arm(config: PluginConfig): void {
    this.config = config;
    this.armed = true;

    // Build presence state keyed by MAC for fast lookup
    this.presenceState.clear();
    const now = Date.now();
    const timeoutMs = config.alarmTimeoutSeconds * 1000;
    for (const member of config.crewMembers) {
      const mac = member.macAddress.toLowerCase();
      const device = this.detectedDevices.get(mac);
      const present = device !== undefined && (now - device.lastSeen) <= timeoutMs;
      this.presenceState.set(mac, {
        member,
        present,
        lastSeen: device?.lastSeen ?? null,
        alarming: false,
      });
    }

    this.checkInterval = setInterval(() => this.check(), 1000);
  }

  disarm(): void {
    this.armed = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    // Only emit alarming members — non-alarming ones never had a SK path created
    const alarmingMembers = Array.from(this.presenceState.values())
      .filter(e => e.alarming)
      .map(e => e.member);
    this.emit('disarmed', alarmingMembers);
    this.presenceState.clear();
    this.config = null;
  }

  isArmed(): boolean {
    return this.armed;
  }

  getDetectedDevices(): BleDevice[] {
    const cutoff = Date.now() - DEVICE_TTL_MS;
    const result: BleDevice[] = [];
    for (const [mac, device] of this.detectedDevices) {
      if (device.lastSeen < cutoff) {
        this.detectedDevices.delete(mac);
      } else {
        result.push(device);
      }
    }
    return result.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  getPresenceState(): PresenceEntry[] {
    return Array.from(this.presenceState.values());
  }

  private check(): void {
    if (!this.config) return;
    const now = Date.now();
    const timeoutMs = this.config.alarmTimeoutSeconds * 1000;

    for (const entry of this.presenceState.values()) {
      if (entry.lastSeen === null) {
        // Never seen — alarm if armed
        if (!entry.alarming) {
          entry.alarming = true;
          entry.present = false;
          this.emit('alarm', entry.member);
        }
        continue;
      }

      const elapsed = now - entry.lastSeen;
      if (elapsed > timeoutMs) {
        if (!entry.alarming) {
          entry.alarming = true;
          entry.present = false;
          this.emit('alarm', entry.member);
        }
      } else {
        if (entry.alarming) {
          entry.alarming = false;
          entry.present = true;
          this.emit('clear', entry.member);
        }
      }
    }
  }
}

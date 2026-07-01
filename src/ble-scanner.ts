import { EventEmitter } from 'events';
import noble from '@abandonware/noble';

export interface RawDevice {
  mac: string;
  name: string | null;
  rssi: number;
}

export class BleScanner extends EventEmitter {
  private scanning = false;

  start(): void {
    noble.on('stateChange', this.onStateChange);
    noble.on('discover', this.onDiscover);
  }

  stop(): void {
    noble.removeListener('stateChange', this.onStateChange);
    noble.removeListener('discover', this.onDiscover);
    if (this.scanning) {
      noble.stopScanning();
      this.scanning = false;
    }
  }

  private onStateChange = (state: string): void => {
    this.emit('state', state);
    if (state === 'poweredOn') {
      noble.startScanning([], true);
      this.scanning = true;
    } else {
      this.scanning = false;
    }
  };

  private onDiscover = (peripheral: {
    address: string;
    advertisement: { localName?: string };
    rssi: number;
  }): void => {
    const mac = peripheral.address.toLowerCase();
    const rawName = peripheral.advertisement.localName;
    const name = rawName && rawName !== '\x00' && rawName.trim() !== '' ? rawName.trim() : null;
    const rssi = peripheral.rssi;

    this.emit('device', { mac, name, rssi } satisfies RawDevice);
  };
}

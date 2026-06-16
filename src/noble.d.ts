// Ambient module declaration for @abandonware/noble (no official @types package).
// The import must be inside the declare module block so this file stays a "script"
// (no top-level imports) and the declaration is treated as ambient, not as augmentation.

declare module '@abandonware/noble' {
  import { EventEmitter } from 'events';

  interface Advertisement {
    localName?: string;
  }

  interface Peripheral {
    address: string;
    advertisement: Advertisement;
    rssi: number;
  }

  interface Noble extends EventEmitter {
    startScanning(serviceUUIDs: string[], allowDuplicates: boolean): void;
    stopScanning(): void;
  }

  const noble: Noble;
  export = noble;
}

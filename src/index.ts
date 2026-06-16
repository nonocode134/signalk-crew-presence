import { PluginConfig, SignalKApp } from './types';
import { BleScanner } from './ble-scanner';
import { PresenceMonitor } from './presence-monitor';
import { Notifier } from './notifier';
import { createRouter } from './web-router';

module.exports = function plugin(app: SignalKApp) {
  const id = 'signalk-crew-presence';
  let scanner: BleScanner | null = null;
  let monitor: PresenceMonitor | null = null;
  let notifier: Notifier | null = null;
  let currentConfig: PluginConfig = { crewMembers: [], alarmTimeoutSeconds: 30 };
  let routerRegistered = false;

  function saveConfig(config: PluginConfig, callback: (err: Error | null) => void): void {
    currentConfig = config;
    // Signal K saves options when plugin restarts; we persist in memory for the session
    // and rely on the SK admin UI for durable config via schema
    callback(null);
  }

  return {
    id,
    name: 'Crew Presence Monitor',
    description: 'Surveillance de présence d\'équipage via BLE passif',

    schema: {
      type: 'object',
      properties: {
        alarmTimeoutSeconds: {
          type: 'number',
          title: 'Délai d\'alarme (secondes)',
          default: 30,
          minimum: 5,
        },
        crewMembers: {
          type: 'array',
          title: 'Membres d\'équipage',
          default: [],
          items: {
            type: 'object',
            required: ['name', 'macAddress'],
            properties: {
              name: {
                type: 'string',
                title: 'Nom',
              },
              macAddress: {
                type: 'string',
                title: 'Adresse MAC (ex: 4d:74:0f:ec:e6:7f)',
              },
            },
          },
        },
      },
    },

    start(options: PluginConfig): void {
      currentConfig = {
        alarmTimeoutSeconds: options?.alarmTimeoutSeconds ?? 30,
        crewMembers: options?.crewMembers ?? [],
      };

      scanner = new BleScanner();
      monitor = new PresenceMonitor();
      notifier = new Notifier(app, id);

      scanner.on('device', (d) => monitor!.onDevice(d));

      monitor.on('alarm', (member) => {
        app.debug(`Alarme : ${member.name} introuvable`);
        notifier!.setPresence(
          member.name,
          'alarm',
          `${member.name} n'est plus détecté depuis ${currentConfig.alarmTimeoutSeconds}s`,
        );
        app.setPluginStatus(`ALARME — ${member.name} introuvable`);
      });

      monitor.on('clear', (member) => {
        app.debug(`Retour : ${member.name} détecté`);
        notifier!.setPresence(member.name, 'normal', `${member.name} est à bord`);
        app.setPluginStatus('Armé — équipage présent');
      });

      scanner.start();
      notifier.startHeartbeat();

      // Register router once per plugin lifecycle
      if (!routerRegistered) {
        app.use(
          `/plugins/${id}`,
          createRouter(monitor, () => currentConfig, saveConfig),
        );
        routerRegistered = true;
      }

      app.setPluginStatus('En écoute BLE — désarmé');
    },

    stop(): void {
      scanner?.stop();
      monitor?.disarm();
      notifier?.stopHeartbeat();
      scanner = null;
      monitor = null;
      notifier = null;
    },
  };
};

import { SignalKApp } from './types';

type PresenceState = 'normal' | 'alarm';

export class Notifier {
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private app: SignalKApp, private pluginId: string) {}

  setPresence(memberName: string, state: PresenceState, message: string): void {
    const slug = memberName.replace(/[^a-zA-Z0-9_]/g, '_');
    this.app.handleMessage(this.pluginId, {
      context: 'vessels.self',
      updates: [{
        source: { label: this.pluginId },
        timestamp: new Date().toISOString(),
        values: [{
          path: `notifications.crewPresence.${slug}`,
          value: {
            state,
            method: state === 'alarm' ? ['visual', 'sound'] : [],
            message,
          },
        }],
      }],
    });
  }

  clearPresence(memberName: string): void {
    const slug = memberName.replace(/[^a-zA-Z0-9_]/g, '_');
    this.app.handleMessage(this.pluginId, {
      context: 'vessels.self',
      updates: [{
        source: { label: this.pluginId },
        timestamp: new Date().toISOString(),
        values: [{
          path: `notifications.crewPresence.${slug}`,
          value: null,
        }],
      }],
    });
  }

  startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.app.handleMessage(this.pluginId, {
        context: 'vessels.self',
        updates: [{
          source: { label: this.pluginId },
          timestamp: new Date().toISOString(),
          values: [{
            path: 'plugins.signalk-crew-presence.heartbeat',
            value: Math.floor(Date.now() / 1000),
          }],
        }],
      });
    }, 5000);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

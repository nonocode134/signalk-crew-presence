import path from 'path';
import { Router, Request, Response, NextFunction } from 'express';
import { PluginConfig } from './types';
import { PresenceMonitor } from './presence-monitor';

// express is a peer dep provided by Signal K server at runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express') as typeof import('express');

export function createRouter(
  monitor: PresenceMonitor,
  getConfig: () => PluginConfig,
  saveConfig: (config: PluginConfig, callback: (err: Error | null) => void) => void,
): Router {
  const router = express.Router();
  const publicDir = path.join(__dirname, '..', 'public');

  router.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  router.get('/api/status', (_req: Request, res: Response) => {
    res.json({
      armed: monitor.isArmed(),
      presenceState: monitor.getPresenceState(),
      detectedDevices: monitor.getDetectedDevices(),
      config: getConfig(),
    });
  });

  router.post('/api/arm', (_req: Request, res: Response) => {
    const config = getConfig();
    if (config.crewMembers.length === 0) {
      res.status(400).json({ error: "Aucun membre d'équipage configuré" });
      return;
    }
    monitor.arm(config);
    res.json({ armed: true });
  });

  router.post('/api/disarm', (_req: Request, res: Response) => {
    monitor.disarm();
    res.json({ armed: false });
  });

  router.use(express.json());

  router.post('/api/config', (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as Partial<PluginConfig>;
    if (
      typeof body !== 'object' ||
      body === null ||
      typeof body.alarmTimeoutSeconds !== 'number' ||
      body.alarmTimeoutSeconds < 5 ||
      !Array.isArray(body.crewMembers)
    ) {
      res.status(400).json({ error: 'Configuration invalide' });
      return;
    }

    const newConfig: PluginConfig = {
      alarmTimeoutSeconds: body.alarmTimeoutSeconds,
      crewMembers: body.crewMembers.map((m) => ({
        name: String(m.name || '').trim(),
        macAddress: String(m.macAddress || '').toLowerCase().trim(),
      })).filter((m) => m.name && m.macAddress),
    };

    const wasArmed = monitor.isArmed();
    if (wasArmed) monitor.disarm();

    saveConfig(newConfig, (err) => {
      if (err) {
        next(err);
        return;
      }
      if (wasArmed) monitor.arm(newConfig);
      res.json({ ok: true, config: newConfig });
    });
  });

  return router;
}

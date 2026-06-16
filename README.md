# signalk-crew-presence

Plugin Signal K de surveillance de présence d'équipage via BLE passif pour voilier. Détecte les beacons Bluetooth des membres d'équipage (téléphones, trackers) et déclenche une alarme Signal K si l'un d'eux disparaît du scan pendant trop longtemps.

## Fonctionnalités

- Scan BLE passif continu (pas de connexion aux appareils)
- Interface web intégrée pour assigner les devices BLE aux membres d'équipage
- Système ARM / DISARM avec alarmes Signal K natives
- Notifications sur `notifications.crewPresence.<membre>`
- Heartbeat sur `vessels.self.plugins.signalk-crew-presence.heartbeat`
- Configuration via l'interface web ou le panneau admin Signal K

## Installation sur le Raspberry Pi

### 1. Permission BLE (une seule fois)

```bash
sudo setcap cap_net_raw+eip $(which node)
```

### 2. Installation du plugin

```bash
cd ~/.signalk
npm install github:nonocode134/signalk-crew-presence
```

Le build TypeScript se lance automatiquement à l'installation via le script `prepare`.

### 3. Redémarrage de Signal K

```bash
sudo systemctl restart signalk
```

### 4. Activation

Dans l'admin Signal K : **Server → Plugin Config → Crew Presence Monitor** → activer.

## Utilisation

Ouvrir l'interface web depuis Signal K Admin → **Appserver → signalk-crew-presence**, ou directement :

```
http://<ip-du-pi>:3000/plugins/signalk-crew-presence/
```

1. Les devices BLE détectés apparaissent dans le tableau "Devices BLE détectés"
2. Cliquer "Assigner à…" pour lier un device à un membre d'équipage
3. Régler le délai d'alarme dans Réglages (défaut : 30 secondes)
4. Cliquer **ARM** pour activer la surveillance
5. Si un membre n'est plus détecté, une alarme Signal K est déclenchée

## Chemins Signal K publiés

| Chemin | Description |
|--------|-------------|
| `notifications.crewPresence.<membre>` | État de présence (normal / alarm) |
| `vessels.self.plugins.signalk-crew-presence.heartbeat` | Timestamp Unix, mis à jour toutes les 5s |

## Test

Vérifier le heartbeat dans le Data Browser de Signal K (`vessels.self.plugins.signalk-crew-presence.heartbeat`).

Pour tester l'alarme : armer le système, puis activer le mode avion sur un téléphone assigné. Après le délai configuré, une alarme doit apparaître dans l'admin Signal K.

## Architecture

```
BleScanner → PresenceMonitor → Notifier → Signal K
                    ↓
               WebRouter → UI web
```

Les modules communiquent via EventEmitter (`'alarm'`, `'clear'`) pour permettre des extensions futures (logbook, MQTT, MOB waypoint) sans modifier le cœur.

## Licence

MIT

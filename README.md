<p align="center">
  <img src="icon.svg" alt="PIA Relay Logo" width="21%">
</p>

# PIA Relay on StartOS

> Everything not listed in this document should behave the same as upstream
> PIA's manual connection scripts. If a feature, setting, or behavior is not
> mentioned here, the upstream documentation is accurate and fully applicable —
> see the Documentation section of `instructions.md` for links.

PIA Relay keeps a [Private Internet Access](https://www.privateinternetaccess.com/) WireGuard connection alive and renews it automatically. It is a relay, not a client for one device: the user imports a static WireGuard config from it once as a StartOS gateway, and any service can then be pointed at that gateway. It is based on PIA's [manual-connections](https://github.com/pia-foss/manual-connections) scripts, rewritten as a daemon. This is a community package and is not made or endorsed by PIA.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, built from the repo `Dockerfile`: Alpine with `wireguard-go`, `wireguard-tools`, `iproute2`, `iptables`, `curl`, `jq` and `bash`. Upstream publishes no image. The manifest sets `virtualNetworking: true`, which gives the container the network privileges to create interfaces. Both interfaces use the host's kernel WireGuard module (confirmed on a StartOS box); `wireguard-go` is installed only as a fallback `wg-quick` uses if the module is missing.

| Property      | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| Image         | Built from the repo `Dockerfile`                                                           |
| Architectures | x86_64, aarch64                                                                            |
| Entrypoint    | `/usr/local/bin/pia-supervisor`, run as the container's init process                       |

| Subcontainer | Purpose                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| `pia`        | Runs the `configure-network` oneshot and the `pia` daemon; the one to `attach` to |

The container holds two WireGuard interfaces:

- `wg0` is a server with static keys on UDP 51820, tunnel address `10.45.0.1/24`. The StartOS gateway connects to it as `10.45.0.2`.
- `pia` is a client to PIA, created with `Table = off` so it adds no routes of its own.

Traffic arriving on `wg0` is routed by its own table (`51888`), whose only default route is `dev pia`, and is masqueraded out `pia`. Traffic the container starts itself, such as the PIA login, uses the normal route. The `FORWARD` policy is `DROP` and only `wg0` to `pia` is accepted. An `ip rule` with `unreachable` follows the lookup, so with `pia` down nothing falls through to `eth0`. These rules are installed before `wg0` comes up. IPv6 is disabled in the container.

## Volume and Data Layout

One volume holds the stored settings, the static keys, and the rendered server config.

| Volume | Mount Point | Purpose                                          |
| ------ | ----------- | ------------------------------------------------ |
| `main` | `/data`     | Store, rendered `wg0` config, connection status  |

| Path               | Written by       | Contents                                                                                           |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------------- |
| `/data/store.json` | StartOS actions  | PIA username and password, region, and the server and gateway WireGuard keypairs                   |
| `/data/wg0.conf`   | `main.ts`, `0600` | The rendered server config: one `[Peer]`, the StartOS gateway                                      |
| `/data/pia.status` | the supervisor   | JSON: state, message, region name, server IP, connection time, next renewal. No credentials or keys |

The PIA login token and the per-connection PIA WireGuard key exist only in memory and in `/run/pia.conf` (`0600`) inside the container. A new key is registered on every connection.

## File Models

One file model, `store.json`, built with `z.looseObject`.

| File               | Model                              | Fields                                                                                                          |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/data/store.json` | `startos/fileModels/store.json.ts` | `piaUsername`, `piaPassword`, `region` (`auto` by default), `serverPrivateKey`/`serverPublicKey`, `clientPrivateKey`/`clientPublicKey` |

`main.ts` reads it with `.const()`, so any change restarts the service. The supervisor reads it with `jq` at each connection attempt and never writes it.

## Dependencies

None.

## Network Access and Interfaces

One interface, which carries the connection from StartOS's own gateway and nothing a browser opens.

| Interface      | Id      | Type | Container Port | Description                                          |
| -------------- | ------- | ---- | -------------- | ---------------------------------------------------- |
| Relay Endpoint | `relay` | p2p  | 51820/udp      | Receives the connection from the StartOS gateway     |

The binding exists so StartOS forwards a port to the container. The gateway config's endpoint is the binding's bridge address, resolved with `sdk.host.getBridgeAddress` (`10.0.3.1:<assigned port>`); that address is the same for traffic the server itself sends, and survives restarts and updates while the binding is unchanged. No public address should be enabled on this interface.

The gateway config has no IPv6 address and no `DNS` line. StartOS then drops outbound IPv6 for services using the gateway, and resolves their names through the gateway's fallback resolver (through the tunnel), not through the user's ISP.

The package itself must keep using the system gateway, and the user must never select this gateway system-wide. Otherwise the relay's own login and handshake traffic would route into its own tunnel.

## Installation and First-Run Flow

On first install `seedKeys` generates two WireGuard keypairs (the server's and the gateway's) in a temporary subcontainer and stores them. They are never regenerated. The critical task **Set PIA Login** appears until a username and password are stored. Until then `main.ts` throws and the service does not start.

After that: start, wait for the **PIA Tunnel** check, run **Show Gateway Config**, import it under System → Gateways, and select it on each service's Outbound Traffic tab.

On start the supervisor installs the firewall and routing, brings up `wg0`, then loops: log in (token valid 24 hours), choose a server, register a fresh key with `addKey`, bring up `pia`, wait up to 30 seconds for a handshake. It renews every 12 hours (a few seconds without a tunnel, during which the kill switch drops traffic) and rebuilds the tunnel when no handshake arrives for 180 seconds, trying the next server each time.

## Actions

Four actions, all visible. What the OS cannot express:

| Action                | When                                                   | Notes                                                                                                   |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `set-login`           | First setup, or after the PIA password changes         | Rewrites `store.json` and restarts the service. Safe to repeat.                                         |
| `choose-region`       | Any time                                               | Region list is fetched live from PIA when the form opens; if that fails only Automatic is offered. Restarts the service. |
| `show-gateway-config` | Once, to import the gateway; again only to re-import   | Returns the same config every time. It contains the gateway's private key, so it is masked.             |
| `view-status`         | Diagnosing                                             | Reads `/data/pia.status`. Only available while running.                                                 |

## Tasks

| Task          | Severity   | Raised when                                |
| ------------- | ---------- | ------------------------------------------ |
| `set-login`   | `critical` | No PIA username or password is stored      |

## Health Checks

One check, `pia`, shown as **PIA Tunnel**. It runs `/usr/local/bin/pia-health`, which succeeds only when `wg0` exists and `pia` has handshaken within the last 180 seconds.

| Message                                  | Meaning                                                               |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `The relay server interface (wg0) is down` | The server interface failed to come up                                |
| `Not connected to PIA: …`                | The tunnel is down; the reason is the supervisor's last status message |
| `Waiting for the first handshake with PIA` | `pia` exists but has not handshaken yet                              |
| `No handshake with PIA for Ns`           | The tunnel is stale; the supervisor will rebuild it                   |

`Not connected to PIA` with a login message means the stored credentials were rejected or PIA could not be reached. Diagnose with `start-cli package attach pia -n pia -- cat /data/pia.status`.

## Backups and Restore

The whole `main` volume is backed up. This includes the PIA password and the static keys. Restoring keeps the same keys, so a gateway already imported into StartOS keeps working without being re-imported.

## Limitations and Differences

1. **The relay carries IPv4 only.** IPv6 is disabled in the container and the gateway config has no IPv6 address.
2. **No port forwarding.** PIA's port forwarding is not implemented, so services cannot receive inbound connections through PIA.
3. **A brief gap at each renewal.** The tunnel is rebuilt rather than rotated in place, so there is a few seconds' outage every twelve hours.
4. **The password is stored in the clear in the service's data and backups**, because PIA tokens last only 24 hours and renewal needs the password.
5. **No DNS line.** Services resolve through StartOS's fallback resolver, carried through the tunnel, not PIA's own resolver.
6. **Not a general WireGuard server.** One fixed peer, tunnel `10.45.0.0/24`, MTU 1420. The address is not configurable.
7. **Untested by Start9.** Using a package's own WireGuard server as a StartOS gateway is not a documented pattern.

---

## Quick Reference for AI Consumers

```yaml
package_id: pia
image: built from Dockerfile (Alpine)
architectures: [x86_64, aarch64]
subcontainers: [pia]
volumes:
  main: /data
file_models:
  - /data/store.json
startos_managed_env_vars: []
dependencies: none
interfaces:
  relay: { type: p2p, port: 51820 }
actions:
  - set-login
  - choose-region
  - show-gateway-config
  - view-status
tasks:
  - { action: set-login, severity: critical }
health_checks:
  - pia
```

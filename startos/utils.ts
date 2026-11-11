// Constants and helpers shared across this package's startos/ code.

export const wireguardPort = 51820
export const serverAddress = '10.45.0.1'
export const clientAddress = '10.45.0.2'
export const tunnelCidr = '10.45.0.0/24'
export const tunnelMtu = 1420
export const statusFile = '/pia.status'

export type StaticKeys = {
  serverPrivateKey: string
  serverPublicKey: string
  clientPrivateKey: string
  clientPublicKey: string
}

/** The server config the daemon applies with wg-quick. Firewall and routing
 *  are installed by the supervisor script, not here. */
export function renderServerConfig(keys: StaticKeys): string {
  return `[Interface]
PrivateKey = ${keys.serverPrivateKey}
Address = ${serverAddress}/24
ListenPort = ${wireguardPort}
MTU = ${tunnelMtu}

[Peer]
PublicKey = ${keys.clientPublicKey}
AllowedIPs = ${clientAddress}/32
`
}

/** The config the user imports under System → Gateways. No IPv6 address and
 *  no DNS line: StartOS then drops IPv6 for pinned services and resolves
 *  through the gateway. */
export function renderGatewayConfig(
  keys: StaticKeys,
  endpoint: string,
): string {
  return `[Interface]
PrivateKey = ${keys.clientPrivateKey}
Address = ${clientAddress}/32
MTU = ${tunnelMtu}

[Peer]
PublicKey = ${keys.serverPublicKey}
AllowedIPs = 0.0.0.0/0
Endpoint = ${endpoint}
PersistentKeepalive = 25
`
}

export type PiaStatus = {
  state: string
  message: string
  regionName: string
  server: string
  connectedAt: number
  renewAt: number
}

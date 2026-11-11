import { i18n } from './i18n'
import { sdk } from './sdk'
import { wireguardPort } from './utils'

export const relayHostId = 'relay'
export const relayInterfaceId = 'relay'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const host = sdk.MultiHost.of(effects, relayHostId)
  const origin = await host.bindPort(wireguardPort, {
    protocol: null,
    preferredExternalPort: wireguardPort,
    addSsl: null,
    secure: { ssl: false },
  })
  const relay = sdk.createInterface(effects, {
    name: i18n('Relay Endpoint'),
    id: relayInterfaceId,
    description: i18n(
      'Receives the connection from your StartOS gateway. Do not enable a public address for it.',
    ),
    type: 'p2p',
    masked: false,
    schemeOverride: { ssl: null, noSsl: null },
    username: null,
    path: '',
    query: {},
  })

  return [await origin.export([relay])]
})

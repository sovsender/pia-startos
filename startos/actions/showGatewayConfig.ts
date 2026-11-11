import { i18n } from '../i18n'
import { relayHostId } from '../interfaces'
import { sdk } from '../sdk'
import { renderGatewayConfig, wireguardPort } from '../utils'
import { readStore, staticKeys } from './helpers'

export const showGatewayConfig = sdk.Action.withoutInput(
  'show-gateway-config',
  async () => ({
    name: i18n('Show Gateway Config'),
    description: i18n(
      'The WireGuard config to import under System → Gateways. Import it once; it does not expire.',
    ),
    warning: i18n(
      'This config contains a private key. Only copy or download it to import it into StartOS.',
    ),
    allowedStatuses: 'any',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const keys = staticKeys(await readStore())
    const endpoint = await sdk.host
      .getBridgeAddress(effects, {
        hostId: relayHostId,
        internalPort: wireguardPort,
      })
      .once()
    if (!keys || !endpoint) {
      throw new Error(
        i18n(
          'The relay is not set up yet. Start the service once and try again.',
        ),
      )
    }
    return {
      version: '1' as const,
      title: i18n('Gateway Config'),
      message: i18n(
        'Import this under System → Gateways, then choose that gateway on the Outbound Traffic tab of each service you want to send through PIA.',
      ),
      result: {
        type: 'group' as const,
        value: [
          {
            type: 'multiline' as const,
            name: i18n('Gateway config'),
            description: null,
            value: renderGatewayConfig(keys, endpoint),
            masked: true,
            copyable: true,
            qr: false,
            filename: 'pia-relay.conf',
          },
        ],
      },
    }
  },
)

import { emptyStore, store } from './fileModels/store.json'
import { hasLogin, staticKeys } from './actions/helpers'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { renderServerConfig } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  const current = (await store.read().const(effects)) ?? emptyStore()
  if (!hasLogin(current)) {
    throw new Error(i18n('Set your PIA login before starting the relay.'))
  }
  const keys = staticKeys(current)
  if (!keys) {
    throw new Error(
      i18n(
        'The relay is not set up yet. Start the service once and try again.',
      ),
    )
  }
  await sdk.volumes.main.writeFile('/wg0.conf', renderServerConfig(keys), {
    mode: 0o600,
  })

  const relay = sdk.SubContainer.of(
    effects,
    { imageId: 'pia' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'pia',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('configure-network', {
      subcontainer: relay,
      exec: {
        command: ['/usr/local/bin/configure-network'],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('pia', {
      subcontainer: relay,
      exec: {
        command: sdk.useEntrypoint(),
        runAsInit: true,
      },
      ready: {
        display: i18n('PIA Tunnel'),
        fn: () =>
          sdk.healthCheck.runHealthScript(
            ['/usr/local/bin/pia-health'],
            relay,
            {
              message: () => i18n('The PIA tunnel is up'),
              errorMessage: i18n('The PIA tunnel is not up'),
            },
          ),
      },
      requires: ['configure-network'],
    })
})

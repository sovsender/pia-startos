import { randomUUID } from 'node:crypto'
import { T } from '@start9labs/start-sdk'
import { emptyStore, store, Store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { StaticKeys } from '../utils'

export async function readStore(): Promise<Store> {
  return (await store.read().once()) ?? emptyStore()
}

export function staticKeys(config: Store): StaticKeys | null {
  if (
    !config.serverPrivateKey ||
    !config.serverPublicKey ||
    !config.clientPrivateKey ||
    !config.clientPublicKey
  ) {
    return null
  }
  return {
    serverPrivateKey: config.serverPrivateKey,
    serverPublicKey: config.serverPublicKey,
    clientPrivateKey: config.clientPrivateKey,
    clientPublicKey: config.clientPublicKey,
  }
}

export function hasLogin(config: Store | null): boolean {
  return !!config?.piaUsername && !!config?.piaPassword
}

/** Generates the two static keypairs: the relay server's and the one the
 *  StartOS gateway uses to connect to it. Neither ever changes afterwards. */
export async function generateStaticKeys(
  effects: T.Effects,
): Promise<StaticKeys> {
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'pia' },
    null,
    `generate-keys-${randomUUID()}`,
    async (sub) => {
      const result = await sub.execFail([
        'sh',
        '-c',
        'sp="$(wg genkey)"; spp="$(printf "%s" "$sp" | wg pubkey)"; cp="$(wg genkey)"; cpp="$(printf "%s" "$cp" | wg pubkey)"; printf "%s\\n%s\\n%s\\n%s\\n" "$sp" "$spp" "$cp" "$cpp"',
      ])
      const values = result.stdout.toString().trim().split('\n')
      if (values.length < 4) {
        throw new Error(
          i18n(
            'The relay is not set up yet. Start the service once and try again.',
          ),
        )
      }
      return {
        serverPrivateKey: values[0],
        serverPublicKey: values[1],
        clientPrivateKey: values[2],
        clientPublicKey: values[3],
      }
    },
  )
}

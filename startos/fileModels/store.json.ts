import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  piaUsername: z.string().nullable().catch(null),
  piaPassword: z.string().nullable().catch(null),
  region: z.string().catch('auto'),
  serverPrivateKey: z.string().nullable().catch(null),
  serverPublicKey: z.string().nullable().catch(null),
  clientPrivateKey: z.string().nullable().catch(null),
  clientPublicKey: z.string().nullable().catch(null),
})

export type Store = z.infer<typeof shape>

export const store = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)

export function emptyStore(): Store {
  return {
    piaUsername: null,
    piaPassword: null,
    region: 'auto',
    serverPrivateKey: null,
    serverPublicKey: null,
    clientPrivateKey: null,
    clientPublicKey: null,
  }
}

import { generateStaticKeys, readStore, staticKeys } from '../actions/helpers'
import { store } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedKeys = sdk.setupOnInit(async (effects) => {
  if (staticKeys(await readStore())) return
  await store.merge(effects, await generateStaticKeys(effects))
})

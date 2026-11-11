import { setLogin } from '../actions/setLogin'
import { hasLogin } from '../actions/helpers'
import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchSetup = sdk.setupOnInit(async (effects) => {
  const current = await store.read().const(effects)

  await sdk.action.clearTask(effects, 'pia:set-login')

  if (!hasLogin(current)) {
    await sdk.action.createOwnTask(effects, setLogin, 'critical', {
      reason: i18n('Enter your PIA username and password.'),
    })
  }
})

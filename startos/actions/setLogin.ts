import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { hasLogin, readStore } from './helpers'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  username: Value.text({
    name: i18n('PIA username'),
    description: i18n('Your PIA account username, for example p1234567.'),
    required: true,
    default: null,
    placeholder: 'p1234567',
    minLength: 1,
    maxLength: 64,
    patterns: [],
  }),
  password: Value.text({
    name: i18n('PIA password'),
    description: i18n(
      'Your PIA account password. It is stored in this service’s data and included in its backups.',
    ),
    required: true,
    default: null,
    masked: true,
    placeholder: null,
    minLength: 1,
    maxLength: 256,
    patterns: [],
  }),
})

export const setLogin = sdk.Action.withInput(
  'set-login',
  async ({ effects }) => ({
    name: i18n('Set PIA Login'),
    description: i18n(
      'Save the username and password of your PIA account. The relay uses them to renew its connection automatically.',
    ),
    warning: hasLogin(await store.read().const(effects))
      ? i18n('Replaces the saved PIA login and restarts the connection.')
      : null,
    allowedStatuses: 'any',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => {
    const current = await readStore()
    return { username: current.piaUsername ?? undefined }
  },
  async ({ effects, input }) => {
    await store.merge(effects, {
      piaUsername: input.username.trim(),
      piaPassword: input.password,
    })
  },
)

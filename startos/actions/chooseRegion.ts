import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { readStore } from './helpers'

const { InputSpec, Value } = sdk

const serverListUrl = 'https://serverlist.piaservers.net/vpninfo/servers/v6'

async function loadRegions(): Promise<Record<string, string> | null> {
  try {
    const response = await fetch(serverListUrl, {
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) return null
    // The body is the JSON list followed by a signature line.
    const list = JSON.parse((await response.text()).split('\n')[0]) as {
      regions: Array<{ id: string; name: string; geo?: boolean }>
    }
    return Object.fromEntries(
      list.regions
        .filter((region) => region.id && region.name)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((region) => [
          region.id,
          region.geo ? `${region.name} (virtual)` : region.name,
        ]),
    )
  } catch {
    return null
  }
}

const inputSpec = InputSpec.of({
  region: Value.dynamicSelect(async () => {
    const regions = await loadRegions()
    const values: Record<string, string> = {
      auto: i18n('Automatic (fastest)'),
      ...(regions ?? {}),
    }
    return {
      name: i18n('Region'),
      description: i18n(
        'Changing the region restarts the connection for a few seconds.',
      ),
      values,
      default: 'auto',
      disabled: regions
        ? false
        : i18n('Could not load the PIA region list. Try again in a moment.'),
    }
  }),
})

export const chooseRegion = sdk.Action.withInput(
  'choose-region',
  async () => ({
    name: i18n('Choose Region'),
    description: i18n(
      'Pick the PIA location the relay connects to, or let it choose the fastest one.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Setup'),
    visibility: 'enabled',
  }),
  inputSpec,
  async () => ({ region: (await readStore()).region }),
  async ({ effects, input }) => {
    await store.merge(effects, { region: input.region })
  },
)

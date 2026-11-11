import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { PiaStatus, statusFile } from '../utils'

function when(seconds: number): string {
  return seconds > 0
    ? new Date(seconds * 1000).toISOString().replace('T', ' ').slice(0, 19) +
        ' UTC'
    : i18n('Not available yet')
}

export const viewStatus = sdk.Action.withoutInput(
  'view-status',
  async () => ({
    name: i18n('View Status'),
    description: i18n(
      'Show whether the relay is connected to PIA and when it will next renew.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('Information'),
    visibility: 'enabled',
  }),
  async () => {
    let status: PiaStatus
    try {
      status = JSON.parse(
        String(await sdk.volumes.main.readFile(statusFile, 'utf8')),
      )
    } catch {
      throw new Error(
        i18n(
          'The relay has not reported a status yet. Start the service and try again.',
        ),
      )
    }
    const single = (name: string, value: string) => ({
      type: 'single' as const,
      name,
      description: null,
      value,
      masked: false,
      copyable: false,
      qr: false,
      launchable: false,
    })
    return {
      version: '1' as const,
      title: i18n('PIA Status'),
      message: null,
      result: {
        type: 'group' as const,
        value: [
          single(i18n('Status'), status.message),
          single(
            i18n('Region'),
            status.regionName || i18n('Not available yet'),
          ),
          single(i18n('Server'), status.server || i18n('Not available yet')),
          single(i18n('Connected since'), when(status.connectedAt)),
          single(i18n('Next renewal'), when(status.renewAt)),
        ],
      },
    }
  },
)

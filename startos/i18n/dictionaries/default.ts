export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Set your PIA login before starting the relay.': 0,
  'The relay is not set up yet. Start the service once and try again.': 1,
  'PIA Tunnel': 2,
  'The PIA tunnel is up': 3,
  'The PIA tunnel is not up': 4,
  // actions/chooseRegion.ts
  Region: 5,
  'Changing the region restarts the connection for a few seconds.': 6,
  'Automatic (fastest)': 7,
  'Could not load the PIA region list. Try again in a moment.': 8,
  'Choose Region': 9,
  'Pick the PIA location the relay connects to, or let it choose the fastest one.': 10,
  Setup: 11,
  // actions/showGatewayConfig.ts
  'Show Gateway Config': 12,
  'The WireGuard config to import under System → Gateways. Import it once; it does not expire.': 13,
  'This config contains a private key. Only copy or download it to import it into StartOS.': 14,
  'Gateway Config': 15,
  'Import this under System → Gateways, then choose that gateway on the Outbound Traffic tab of each service you want to send through PIA.': 16,
  'Gateway config': 17,
  // actions/setLogin.ts
  'PIA username': 18,
  'Your PIA account username, for example p1234567.': 19,
  'PIA password': 20,
  'Your PIA account password. It is stored in this service’s data and included in its backups.': 21,
  'Set PIA Login': 22,
  'Save the username and password of your PIA account. The relay uses them to renew its connection automatically.': 23,
  'Replaces the saved PIA login and restarts the connection.': 24,
  // actions/viewStatus.ts
  'Not available yet': 25,
  'View Status': 26,
  'Show whether the relay is connected to PIA and when it will next renew.': 27,
  Information: 28,
  'The relay has not reported a status yet. Start the service and try again.': 29,
  'PIA Status': 30,
  Status: 31,
  Server: 32,
  'Connected since': 33,
  'Next renewal': 34,
  // interfaces.ts
  'Relay Endpoint': 35,
  'Receives the connection from your StartOS gateway. Do not enable a public address for it.': 36,
  // init/watchSetup.ts
  'Enter your PIA username and password.': 37,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict

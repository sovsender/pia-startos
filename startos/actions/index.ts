import { sdk } from '../sdk'
import { chooseRegion } from './chooseRegion'
import { setLogin } from './setLogin'
import { showGatewayConfig } from './showGatewayConfig'
import { viewStatus } from './viewStatus'

export const actions = sdk.Actions.of()
  .addAction(setLogin)
  .addAction(chooseRegion)
  .addAction(showGatewayConfig)
  .addAction(viewStatus)

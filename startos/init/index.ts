import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seedKeys } from './seedKeys'
import { watchSetup } from './watchSetup'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  actions,
  dependencies,
  seedKeys,
  watchSetup,
)

export const uninit = sdk.setupUninit(versionGraph)

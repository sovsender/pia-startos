import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.1:0',
  releaseNotes: {
    en_US:
      'Documentation fix: the relay uses the kernel WireGuard module. Verified on a StartOS server.',
    es_ES:
      'Corrección de documentación: el relé usa el módulo WireGuard del kernel. Verificado en un servidor StartOS.',
    de_DE:
      'Dokumentationskorrektur: Das Relay nutzt das WireGuard-Kernelmodul. Auf einem StartOS-Server geprüft.',
    pl_PL:
      'Poprawka dokumentacji: przekaźnik używa modułu WireGuard jądra. Sprawdzono na serwerze StartOS.',
    fr_FR:
      'Correction de la documentation : le relais utilise le module WireGuard du noyau. Vérifié sur un serveur StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

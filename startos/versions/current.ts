import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:0',
  releaseNotes: {
    en_US:
      'Initial release: a PIA WireGuard relay that renews itself and is used as a StartOS gateway.',
    es_ES:
      'Lanzamiento inicial: un relé WireGuard de PIA que se renueva solo y se usa como puerta de enlace de StartOS.',
    de_DE:
      'Erstveröffentlichung: ein PIA-WireGuard-Relay, das sich selbst erneuert und als StartOS-Gateway dient.',
    pl_PL:
      'Pierwsze wydanie: przekaźnik WireGuard PIA, który sam się odnawia i działa jako brama StartOS.',
    fr_FR:
      'Version initiale : un relais WireGuard PIA qui se renouvelle seul et sert de passerelle StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})

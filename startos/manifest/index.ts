import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'pia',
  title: 'PIA Relay',
  license: 'MIT',
  packageRepo: 'https://github.com/sovsender/pia-startos',
  upstreamRepo: 'https://github.com/pia-foss/manual-connections',
  marketingUrl: 'https://www.privateinternetaccess.com/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    pia: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
  virtualNetworking: true,
})

# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- The kill switch is the order in `assets/pia-supervisor.sh`: the `FORWARD` drop policy and the `unreachable` rule are installed before `wg0` comes up. Never move them after it.
- `main.ts` re-runs on any change to `store.json`. The supervisor writes only `/data/pia.status`, never `store.json`, or the service would restart in a loop.
- The static keys are never regenerated. They are what the user imported as a gateway, and a new pair breaks that gateway.

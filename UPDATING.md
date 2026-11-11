# Updating the upstream version

This package is built from the `Dockerfile` in this repo. There is no pinned upstream release: the PIA logic is in `assets/pia-supervisor.sh`, adapted from [pia-foss/manual-connections](https://github.com/pia-foss/manual-connections), and the base image is Alpine.

## Determining the upstream version

Two things can change upstream:

- **PIA's API or certificate.** Compare `assets/ca.rsa.4096.crt` with the file in `manual-connections`, and re-read its `get_token.sh` and `connect_to_wireguard_with_token.sh` for changes to the token URL, the `addKey` call or the server list URL.

  ```bash
  gh api repos/pia-foss/manual-connections/contents/ca.rsa.4096.crt --jq .content | base64 -d | diff - assets/ca.rsa.4096.crt
  gh api repos/pia-foss/manual-connections/commits/master --jq .sha
  ```

- **The Alpine base image.** The tag in `Dockerfile` (`FROM alpine:…`). Check the latest stable release at <https://hub.docker.com/_/alpine>.

## Applying the bump

Edit the `FROM` tag in `Dockerfile`, and replace `assets/ca.rsa.4096.crt` if it changed. Port any API change into `assets/pia-supervisor.sh`. Then bump `version` in `startos/versions/current.ts`.

## Releasing

1. Set `version` in `startos/versions/current.ts` and update `releaseNotes` in all five locales. A change that should reach users raises the version (`0.1.0:0` → `0.1.0:1`, or a new `<X.Y.Z>:0`). If `current.ts` carries a migration (an `up` that does work), first move that version to its own file, as the packaging guide's `versions.md` describes.
2. Commit and push `master`. Nothing else is needed.

The **Tag and Release** workflow runs on every push to `master` that changes more than Markdown. It reads the package id and `version` from `startos/versions/current.ts` and asks the registry in the `REFERENCE_REGISTRY` repository variable whether that version exists. If it does, the run stops; a push that doesn't change the version publishes nothing. Otherwise it force-pushes the tag `v` plus the version with `:` replaced by `_`, builds both architectures, creates the GitHub Release with the `.s9pk` files, and adds them to the registry in `RELEASE_REGISTRY`. It signs with the `DEV_KEY` repository secret, a CI key that registry authorizes to publish this package.

- A push that bumps the version reaches users right away, so push the bump only after the change works on a box.
- Keep `version` a quoted string literal; the workflow reads it from the file's text.
- A published version is never rebuilt. `0.1.0:0` was published by hand, x86_64 only, so the first CI release needs a new version.

# Fork desktop packages

Builds installable Element Desktop packages from this fork via GitHub Actions
(GitHub-hosted runners only, no local builds).

## What's here

- `build.json` — variant metadata for electron-builder (appId, product name,
  protocol schemes), copied from `element.io/release/build.json`.
- `config.json` — the webapp config embedded into the packaged app. Based on
  `element.io/release/config.json` with two deliberate changes:
    - `update_base_url` **removed**, so the packaged app never auto-updates
      itself back to official Element builds from packages.element.io.
    - `show_labs_settings: true`, so Labs flags (e.g. feature flags used by this
      fork) are visible in Settings without editing config by hand.

## Usage

The `.github/workflows/desktop-fork.yaml` dispatcher passes `config: atxoft.com` to
the shared build pipeline (`build_desktop_prepare.yaml` →
`build_desktop_{linux,windows,macos}.yaml`). Run it from the Actions tab →
"Fork desktop packages" → Run workflow.

Outputs (workflow run artifacts): Windows x64 squirrel installer + MSI,
macOS arm64 dmg + zip, Linux amd64 tar.gz + deb + AppImage. All builds are
unsigned/ad-hoc: macOS launches after right-click → Open (or
`xattr -cr /Applications/Element.app`); Windows shows a SmartScreen warning.

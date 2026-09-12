# Desktop updates

The desktop release workflow runs on every push to `main`.

It calculates the next patch version, builds the Windows installer, signs the updater artifacts, and publishes a GitHub Release with `latest.json`.

## GitHub secrets

Add these repository secrets under **Settings > Secrets and variables > Actions**:

- `TAURI_SIGNING_PRIVATE_KEY`: the complete contents of the private key generated with `npx tauri signer generate`.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: leave empty when using the generated key without a password, or set the password when using a protected key.

The public key is embedded in `apps/desktop/src-tauri/tauri.conf.json`; never commit the private key.

The updater checks GitHub Releases when the Tauri app starts. If a newer signed release exists, it asks the user for confirmation, downloads it, installs it, and relaunches the app.
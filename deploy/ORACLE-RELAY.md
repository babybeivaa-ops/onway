# Oracle ITS relay

## Current preparation (2026-10-30)

- Oracle reserved IP: 129.225.170.100; ITS authenticated request already returned SUCCESS.
- Local source adds opt-in HTTPS relay transport. Production Render has NOT been updated.
- Installer prepared; Oracle installation and network rule application still require execution.
- Node relay tests (3) and existing traffic tests (7) passed.
- Local Python runtime unavailable. Installer compiles relay source, tests bounds, verifies ITS authorization, then verifies live TLS, unauthorized rejection and authenticated upstream success on Oracle.

## Install

Generate the single-file installer using `node deploy/build-relay-installer.mjs <output-path>`.
Upload it to Cloud Shell, copy to `opc@129.225.170.100`, then run `sudo python3 install-onway-relay.py` in an interactive SSH session.
Enter the ITS key at the hidden prompt. Existing credentials and certificates are preserved on rerun.

Service: `onway-relay`; HTTPS port 8443; no third-party Python dependencies.
Only `/eventInfo` bounds are accepted. The destination, API key and event types are server-controlled.
TLS certificate identity is the reserved IP; Render explicitly trusts this certificate, with normal verification enabled.
Certificate expires 365 days after installation. Renew it and update Render's trusted certificate before expiration.

## Remaining activation steps

1. Completed: Oracle installer returned `ONWAY_RELAY_OK`; TLS, authentication, query validation and ITS SUCCESS verified.
2. Confirm current Render outbound ranges in Dashboard (previously 74.220.52.0/24 and 74.220.60.0/24). Installer host firewall uses these ranges. Adjust if Dashboard differs.
3. Completed: user confirmed stateful OCI ingress TCP 8443 from 74.220.52.0/24 and 74.220.60.0/24.
4. Privately transfer `/etc/onway-relay/render.env` values to Render service `onway-demo` (srv-db703dek1f9s73bpc06g): ITS_RELAY_URL, ITS_RELAY_TOKEN, ITS_RELAY_CA_PEM. Do not paste token into chat or screenshots. CA value is PEM (escaped newlines also supported).
5. Release includes the accumulated local UI and functionality changes, compared against the existing deployment branch.
6. Save environment without deploying until compatible source is ready; deploy the service, then verify its real /api/traffic/events response and logs without printing secrets.

Env vars stay Dashboard-managed; render.yaml is intentionally unchanged. If all relay vars are absent, previous direct behavior remains. Partial settings fail startup; relay failures never fall back to direct ITS.
Rollback: remove all three relay env vars and redeploy; this restores direct behavior but original Render IP restriction may still prevent ITS access.

Oracle installation and OCI ingress are complete. Render secret transfer and end-to-end production relay verification remain pending.

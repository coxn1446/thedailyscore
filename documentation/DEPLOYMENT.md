# The Daily Score — Minimal GCP Deployment

Cheapest setup: **Cloud Run** (scale to zero) + shared Cloud SQL in **`nash-data`** (`shared-pg`, database `thedailyscore`). See App Shell Documentation **`SHARED_CLOUD_SQL.md`**.

| | |
|---|---|
| **App project** | `thedailyscore-528401` |
| **Cloud Run region** | `us-central1` |
| **QA** | https://qa.thedailyscore.site |
| **Prod** | https://thedailyscore.site |
| **Cloud SQL** | `nash-data:northamerica-northeast1:shared-pg` |
| **Database** | `thedailyscore` (schemas `qa`, `prod`) |
| **Portraits** | `gs://thedailyscore-528401-uploads` |

Public hosts are `https://qa.thedailyscore.site` and `https://thedailyscore.site`. `_DEFAULT_CLIENT_URL` in the Cloud Build files is those hosts. Cloud Run still serves `https://thedailyscore-qa-911430136543.us-central1.run.app` and `https://thedailyscore-prod-911430136543.us-central1.run.app`.

## Cost estimate (monthly)

| Service | Config | Est. cost |
|---------|--------|-----------|
| Cloud Run | 256Mi, min 0, max 2, CPU only while serving | ~$0 idle; low for light traffic |
| Cloud SQL | Shared `nash-data` / `shared-pg` | pooled — see SHARED_CLOUD_SQL.md |
| Cloud Storage | one standard bucket | ~$0 until portraits accumulate |
| Cloud Scheduler | 1 hourly job (prod reminders) | free tier (3 jobs) |
| Secret Manager | few secrets | free tier |
| **Total** | | Cloud Run + share of shared-pg |

## Deploy

```bash
gcloud config set project thedailyscore-528401
npm run deploy:qa
npm run deploy:prod
```

The npm scripts already pass `--project=thedailyscore-528401`. Cloud Build sets `DEFAULT_CLIENT_URL` from `_DEFAULT_CLIENT_URL` in `cloudbuild-qa.yaml` / `cloudbuild-prod.yaml`. Runtime secrets (DB, session, Google OAuth, cron, portrait bucket) load from Secret Manager.

`--allow-unauthenticated` may fail on this project (org policy). After the first deploy of a new service, grant public invoke once:

```bash
gcloud beta run services add-iam-policy-binding thedailyscore-qa --region=us-central1 --project=thedailyscore-528401 --member=allUsers --role=roles/run.invoker
gcloud beta run services add-iam-policy-binding thedailyscore-prod --region=us-central1 --project=thedailyscore-528401 --member=allUsers --role=roles/run.invoker
```

## Google Sign-In (Console)

OAuth web clients cannot be created with gcloud on a user-owned project (no organization). Create them once in the app project:

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview?project=thedailyscore-528401) while signed in as `williamwildernash@gmail.com`.
2. OAuth consent screen: **External**, **Testing**. App name **The Daily Score**. Support email `williamwildernash@gmail.com`. Add that same address as a **test user**.
3. Create an OAuth 2.0 Client ID, type **Web application**. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://thedailyscore-qa-911430136543.us-central1.run.app`
   - `https://thedailyscore-prod-911430136543.us-central1.run.app`

   Authorized redirect URIs:
   - `http://localhost:8080/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback`
   - `https://thedailyscore-qa-911430136543.us-central1.run.app/api/auth/google/callback`
   - `https://thedailyscore-prod-911430136543.us-central1.run.app/api/auth/google/callback`
4. Store the client id/secret and bounce Cloud Run so it reloads Secret Manager:

```bash
PROJECT_ID=thedailyscore-528401
printf '%s' 'PASTE_CLIENT_ID' | gcloud secrets create GOOGLE_CLIENT_ID --data-file=- --project="$PROJECT_ID"
printf '%s' 'PASTE_CLIENT_SECRET' | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- --project="$PROJECT_ID"
printf '%s' 'PASTE_CLIENT_ID' | gcloud secrets create QA_GOOGLE_CLIENT_ID --data-file=- --project="$PROJECT_ID"
printf '%s' 'PASTE_CLIENT_SECRET' | gcloud secrets create QA_GOOGLE_CLIENT_SECRET --data-file=- --project="$PROJECT_ID"
# If the secrets already exist, use `gcloud secrets versions add NAME --data-file=-` instead of create.
gcloud run services update thedailyscore-prod --region=us-central1 --project="$PROJECT_ID" --update-env-vars=OAUTH_RELOAD="$(date +%s)"
gcloud run services update thedailyscore-qa --region=us-central1 --project="$PROJECT_ID" --update-env-vars=OAUTH_RELOAD="$(date +%s)"
```

5. Confirm `GET /api/health` shows `"GOOGLE_CLIENT_ID": true`. Confirm `GET /api/auth/config` shows a `googleClientId` and `"appleClientId": null`.

Local: put the same `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` and restart `npm run dev`.

Google Sign-In stays in Testing until you publish the consent screen. Only listed test users can complete OAuth until then.

## Sign in with Apple

`/api/auth/config` returns `appleClientId` when `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_KEY` are all set. QA reads the `QA_` copies.

| Environment | Secret | Services ID | Return URL |
| --- | --- | --- | --- |
| QA | `QA_APPLE_CLIENT_ID` | `site.thedailyscore.thedailyscore` | `https://qa.thedailyscore.site/api/auth/apple/callback` |
| Prod | `APPLE_CLIENT_ID` | `site.thedailyscore.app` | `https://thedailyscore.site/api/auth/apple/callback` |

App ID `co.thedailyscore.thedailyscore`. Apple matches the Return URL exactly.

## Reminders

Prod Cloud Scheduler job `thedailyscore-reminders` in `us-central1`: `POST` every hour at minute 0, UTC, to `https://thedailyscore-prod-911430136543.us-central1.run.app/api/internal/reminders` with header `X-Cron-Secret`. The route only notifies readers whose local hour is 20. Push delivery uses `FIREBASE_SERVICE_ACCOUNT_JSON` (Firebase project `thedailyscore-cea9b`).

## Capacitor hostname

Until a custom domain is mapped, point flavors at Cloud Run:

```bash
CAP_QA_URL=https://thedailyscore-qa-911430136543.us-central1.run.app npm run s:qa
CAP_PROD_URL=https://thedailyscore-prod-911430136543.us-central1.run.app npm run s:prod
```

iOS bundle IDs: `site.thedailyscore.dev`, `site.thedailyscore.qa`, `site.thedailyscore.prod`. Dev live-reload loads `http://192.168.1.171:3000`. Vite listens on every interface and points HMR at that host. App Transport Security allows that cleartext URL, and development CORS allows that origin.

## Secrets (already created)

App project Secret Manager:

- `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `INSTANCE_CONNECTION_NAME`, `DB_INSTANCE_UNIX_SOCKET`
- `SESSION_SECRET`, `QA_SESSION_SECRET`
- `CRON_SECRET`, `QA_CRON_SECRET`
- `DEFAULT_CLIENT_URL`, `QA_DEFAULT_CLIENT_URL`
- `GOOGLE_CLOUD_STORAGE_BUCKET`, `QA_GOOGLE_CLOUD_STORAGE_BUCKET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (+ `QA_` copies) after the Console step above
- `FIREBASE_SERVICE_ACCOUNT_JSON`, `QA_FIREBASE_SERVICE_ACCOUNT_JSON` (same admin JSON; Firebase project `thedailyscore-cea9b`)
- `APNS_AUTH_KEY`, `APNS_KEY_ID` (`AUZV9LYX9M`). The server sends through Firebase Admin and does not read these. They are stored so the Apple key is not only on a laptop.
- `APPLE_TEAM_ID`, `QA_APPLE_TEAM_ID` (`J668NFXJYB`)
- `APPLE_KEY_ID` (`4SHGSH9WP5`), `APPLE_KEY` (prod Sign in with Apple key)
- `QA_APPLE_KEY_ID` (`5T92GNQ2GR`), `QA_APPLE_KEY` (QA Sign in with Apple key)
- `QA_APPLE_CLIENT_ID` (`site.thedailyscore.thedailyscore`), `APPLE_CLIENT_ID` (`site.thedailyscore.app`)

Cloud Run default compute SA: `roles/secretmanager.secretAccessor` on `thedailyscore-528401`, `roles/cloudsql.client` on `nash-data`.

## Local database

```bash
createdb thedailyscore
psql -d thedailyscore -f server/db/schema.sql
cp .env.example .env
# edit DB_* and SESSION_SECRET
npm run db:migrate
npm run dev
```

The server applies pending files in `server/db/migrations` on startup, using `DB_SCHEMA` (`public` locally, `qa` or `prod` on Cloud Run). A deploy to QA or production runs that step before the revision serves traffic.

Cloud `qa` and `prod` schemas live on `shared-pg`.

## Health check

`GET /api/health` reports database connectivity, `db_schema`, and whether key secrets are present (boolean flags only).

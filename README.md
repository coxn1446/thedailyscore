# The Daily Score

Broadsheet for daily-game scores. This repository is the signed-in shell: register, sign in, and three placeholder desks.

## Local setup

```bash
createdb thedailyscore
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

The client is [http://localhost:3000](http://localhost:3000). The API is port 8080, proxied at `/api`.

Guests opening `/` land on sign-in. A signed-in reader sees Home, Groups, and Profile.

## Scripts

- `npm test`
- `npm run dev`
- `npm run db:migrate`
- `npm run s` — sync the iOS project with `site.thedailyscore.dev`

QA and production run on Cloud Run in `thedailyscore-528401`. Postgres is the shared instance in `nash-data` (`shared-pg`, database `thedailyscore`, schemas `qa` and `prod`). See `documentation/DEPLOYMENT.md`.

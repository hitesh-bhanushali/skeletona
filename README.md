# Skeletona

Coming-soon landing page for Skeletona — an AI-powered NEET UG + PG medical preparation platform.

**Stack:** Vite · Cloudflare Workers (static assets + API) · Cloudflare KV

---

## Local development

```bash
cd landing
npm install
npm run dev        # opens localhost:5173
```

## Build

```bash
cd landing
npm run build      # outputs to landing/dist/
```

## Cloudflare Workers setup (one-time)

1. Create a KV namespace in the [Cloudflare dashboard](https://dash.cloudflare.com) → Workers & Pages → KV → Create namespace → name it `skeletona-waitlist`
2. Copy the namespace ID into the `id` field under `[[kv_namespaces]]` in `wrangler.toml`
   (the `WAITLIST_KV` binding is applied automatically on deploy — no dashboard binding needed)
3. Set the `EXPORT_SECRET` secret on the Worker (gates the CSV export):
   ```bash
   npx wrangler secret put EXPORT_SECRET
   ```
   or via the dashboard: Worker → Settings → Variables and Secrets → add `EXPORT_SECRET` (encrypted)

## CI deploy

The build runs `cd landing && npm ci && npm run build`, then `npx wrangler deploy`.
The deploy needs a `CLOUDFLARE_API_TOKEN` env var whose token has **Workers Scripts: Edit**
(plus `CLOUDFLARE_ACCOUNT_ID`).

## Waitlist export

Download all signups as CSV:

```
GET https://your-site.workers.dev/api/export?secret=<EXPORT_SECRET>
```

Returns `skeletona-waitlist.csv` with columns: `name, email, phone, timestamp`

## Local testing

```bash
cd landing && npm run build      # build the static assets the Worker serves
cd .. && npx wrangler dev        # serves assets + API at localhost:8787
```

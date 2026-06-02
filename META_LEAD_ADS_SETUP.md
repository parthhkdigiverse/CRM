# Meta (Facebook / Instagram) Lead Ads → AI-Setu CRM

This feature automatically pulls leads from **Facebook & Instagram Lead Ads**
into your existing **Leads** section. It adds:

- Auto-import of Meta leads into the existing leads table (source badge: **Facebook Ad** / **Instagram Ad**)
- New-lead counts that automatically include Meta leads
- A collapsible **📊 Meta Ads Summary** section (today/week/month, top city, top campaign, spend, cost-per-lead, city bar chart)
- Extra Meta fields in each lead's detail view (Ad, Campaign, Ad Set, Form, City, Platform)
- 15-minute background auto-sync + a real-time webhook
- The **Refresh** button also triggers a manual Meta sync and shows "Last synced: x mins ago"

> Note: This CRM backend is **Python / FastAPI + MongoDB**, not Node.js.
> So instead of `axios` / `node-fetch` / `node-cron` we use **`httpx`** (already installed)
> and Python's built-in **asyncio** scheduler. No new packages are required.

> **Credentials are configured PER-ORGANIZATION from the app UI**
> (Settings → Integrations → Meta Lead Ads), not via environment variables.
> Each organization connects its own Facebook/Instagram account. Secrets
> (access token, app secret) are **encrypted at rest** in MongoDB.

---

## 1. What was added / changed

### Backend (`backend/`)
| File | Change |
|------|--------|
| `config.py` | **(edited)** Added all `META_*` settings |
| `models/lead.py` | **(edited)** Added Meta fields + `meta_lead_id` index (additive, all optional) |
| `schemas/lead.py` | **(edited)** Added Meta fields to `LeadResponse` |
| `schemas/meta.py` | **(new)** Meta response schemas |
| `services/meta_service.py` | **(new)** Graph API calls, field parsing, persistence, insights |
| `services/meta_scheduler.py` | **(new)** Background 15-min auto-sync loop |
| `routers/meta.py` | **(new)** `/api/v1/meta/*` endpoints + `/api/webhook/meta` |
| `main.py` | **(edited)** Registered the new routers + start/stop scheduler |
| `scripts/migrate_meta_lead_fields.py` | **(new)** Backfill migration for existing leads |

### Frontend (`frontend/src/`)
| File | Change |
|------|--------|
| `lib/api/meta.ts` | **(new)** Meta API client |
| `lib/leadSources.ts` | **(new)** Source badge styles (Facebook Ad = blue, Instagram Ad = pink gradient) |
| `components/BrandIcons.tsx` | **(new)** Facebook/Instagram SVG icons |
| `components/MetaAdsSummary.tsx` | **(new)** Collapsible Meta Ads Summary + city bar chart |
| `components/EditLeadDialog.tsx` | **(edited)** Shows Meta ad details for Meta leads |
| `pages/Leads.tsx` | **(edited)** Email/phone under name, badges, Refresh→sync, last-synced, summary section |

Nothing was removed — existing WhatsApp/Website badges, statuses, sidebar, auth, and DB structure are untouched.

---

## 2. Backend API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET`  | `/api/v1/meta/status`   | yes | configured? + last sync time |
| `GET/POST` | `/api/v1/meta/sync` | yes | manually trigger a lead fetch |
| `GET`  | `/api/v1/meta/leads`    | yes | all Meta-sourced leads |
| `GET`  | `/api/v1/meta/insights` | yes | ads performance + geo (region) data |
| `GET`  | `/api/v1/meta/summary`  | yes | today/week/month counts, top city/campaign, spend |
| `GET`  | `/api/webhook/meta`     | public | webhook verification (echoes `hub.challenge`) |
| `POST` | `/api/webhook/meta`     | public | real-time leadgen events |

> The frontend `axios` baseURL is `/api/v1`, so data endpoints live under `/api/v1/meta/*`.
> The webhook is intentionally outside `/api/v1` at `/api/webhook/meta` (public, token-verified).

---

## 3. Database fields added to the `leads` collection

MongoDB is schemaless, so these appear automatically on new leads. The migration
backfills them on existing leads as `null`:

```
meta_lead_id, meta_platform, meta_ad_id, meta_ad_name,
meta_campaign_id, meta_campaign_name, meta_adset_id, meta_adset_name,
meta_form_id, meta_form_name, meta_city, meta_raw_fields
```

Run the migration once:

```bash
# from the backend/ folder, using your virtualenv
python scripts/migrate_meta_lead_fields.py
```

It is **idempotent** — safe to run multiple times.

---

## 4. Where credentials are configured (per organization)

There are **no Meta credential environment variables**. Each organization's admin
enters credentials in the app:

**Settings → Integrations → Meta Lead Ads**, with these fields:

| Field | What it is |
|-------|-----------|
| Page Access Token | long-lived token with `leads_retrieval` permission (encrypted at rest) |
| Ad Account ID | `act_XXXX` or `XXXX` (for spend / cost-per-lead) |
| Lead Form IDs | comma separated form IDs to pull from |
| Webhook Verify Token | any secret string you choose (used for the webhook handshake) |
| App Secret | optional — enables `X-Hub-Signature-256` verification (encrypted at rest) |
| Graph API Version | defaults to `v19.0` |
| Auto-sync interval | minutes between background syncs (min 5) |

The only related backend env var is `ENCRYPTION_KEY`, used to encrypt the stored
secrets. **Don't change it after saving credentials** or they can't be decrypted.

---

## 5. Step-by-step setup

### A. Get your Meta credentials
1. Go to **developers.facebook.com** → create / open your App.
2. Add the **Webhooks** and **Leads Retrieval** products.
3. Generate a **Page Access Token** (long-lived) with `leads_retrieval`, `pages_show_list`,
   `pages_read_engagement`, and `ads_read` permissions.
4. Find your **Ad Account ID** (Ads Manager → Account Overview, format `act_XXXX`).
5. Find your **Lead Form IDs** (Meta Business Suite → Instant Forms).
6. Choose any secret string for the **Webhook Verify Token**.
7. (Optional) copy your **App Secret** for signature verification.

### B. Run the migration (once)
```bash
cd backend
python scripts/migrate_meta_lead_fields.py
```

### C. Start the backend
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```
On startup you'll see: `Meta auto-sync loop started (org-aware).`

### D. Enter credentials in the app
Log in as an **admin**, open **Settings → Integrations → Meta Lead Ads**, paste the
values from step A, click **Save Settings**, then **Test Connection** to confirm.

### E. Register the real-time webhook in Meta
Your backend must be reachable over HTTPS. Locally use ngrok (`ngrok http 8000`);
in production use your Render URL. Then in the Meta App Dashboard → **Webhooks → Page → leadgen**:
- **Callback URL:** `https://<your-domain>/api/webhook/meta`
- **Verify Token:** the same **Webhook Verify Token** you saved in Settings
- Subscribe to the **`leadgen`** field, then **Subscribe** your Page.

Meta calls `GET /api/webhook/meta` to verify — the server matches the token to your
organization and echoes `hub.challenge`.

### F. Use it
Open the **Leads** page. You'll see:
- Facebook Ad (blue) / Instagram Ad (pink) badges on Meta leads
- Email + phone under each lead name
- The **📊 Meta Ads Summary** section under the status cards
- The **Refresh** button also triggers a manual sync for your org
- "Last synced: x mins ago" next to **Refresh** (clicking Refresh also syncs Meta)

---

## 6. How it works (data flow)

```
┌─ Background loop (every 15 min) ──────────┐
│ services/meta_scheduler.py                 │
│   → meta_service.sync_all_leads()          │
│       → GET /{FORM_ID}/leads (paged)       │
│       → parse field_data → save (dedup)    │
└────────────────────────────────────────────┘

┌─ Real-time webhook (instant) ─────────────┐
│ POST /api/webhook/meta                     │
│   → verify signature (optional)            │
│   → GET /{leadgen_id}?fields=...           │
│   → save instantly (dedup by meta_lead_id) │
└────────────────────────────────────────────┘

┌─ Refresh button (manual) ─────────────────┐
│ Leads page → POST /api/v1/meta/sync        │
│   → same as background sync, your org      │
└────────────────────────────────────────────┘

┌─ Summary & geo ───────────────────────────┐
│ GET /api/v1/meta/summary                   │
│   → counts from stored leads               │
│   → GET act_{ID}/insights (spend, region)  │
└────────────────────────────────────────────┘
```

Duplicates are skipped by checking `meta_lead_id`. New Meta leads default to
status **New**, so the **New Lead** count includes them automatically.

---

## 7. Resilience

- If the Meta API fails, the Leads page still loads existing leads and shows a small
  amber warning near **Refresh** — it never crashes.
- The Meta Ads Summary section auto-hides if the integration isn't configured and there's no data.
- Insights (spend / cost-per-lead) are optional; if the ad account isn't configured or the
  call fails, the rest of the summary still renders.

---

## 8. Quick manual test (without real Meta data)

The webhook verification can be tested locally:
```bash
curl "http://localhost:8000/api/webhook/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
# → should print: 12345
```
Authenticated endpoints require a Bearer token (log in via the app first).

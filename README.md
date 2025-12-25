# Pingflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/supiri/pingflare)

A self-hosted uptime monitoring solution that runs entirely on Cloudflare's edge network. Monitor your services, create public status pages, and get notified when things go wrong — all with zero server maintenance.

## Why Pingflare?

- **Zero Infrastructure** — Runs on Cloudflare Workers with D1 database. No servers to maintain.
- **Global Edge Monitoring** — Health checks run from Cloudflare's global network, giving you true external monitoring.
- **One-Click Deploy** — Click the button above and you're running in minutes.
- **Free Tier Friendly** — Works within Cloudflare's generous free tier for small-scale monitoring.

## Features

### Monitoring

- **HTTP Health Checks** — Monitor any HTTP/HTTPS endpoint with customizable assertions
- **Multi-Step Scripts** — Chain multiple requests with variable extraction (e.g., login → use token → check API)
- **Visual Script Builder** — Build complex health checks without writing code, or use JSON DSL directly
- **Flexible Assertions** — Check status codes, response times, JSON paths, headers, and more
- **Configurable Intervals** — Check as frequently as every minute

### Status Pages

- **Public Status Pages** — Share your service status with customers at `/status`
- **Monitor Groups** — Organize monitors into logical groups with per-group status
- **90-Day Uptime History** — Visual uptime bars showing daily status
- **Incident Management** — Create and track incidents with status updates

### Notifications

- **Multi-Channel Alerts** — Get notified via Slack, Discord, Webhooks, or Browser Push
- **Per-Monitor Configuration** — Choose which channels notify for which monitors
- **Status Change Triggers** — Alert on down, degraded, or recovery events

### Security

- **Session-Based Auth** — Secure admin dashboard with email/password login
- **Role-Based Access** — Admin, Editor, and Viewer roles
- **No External Dependencies** — All data stays in your Cloudflare account

## One-Click Deploy to Cloudflare

The fastest way to get started:

1. Click the **Deploy to Cloudflare** button above
2. Authorize Cloudflare to access your GitHub account
3. Configure the Worker name and database name (or accept defaults)
4. Click **Deploy**

Cloudflare will automatically:

- Fork the repository to your GitHub account
- Create a D1 database for storing monitors and check history
- Deploy the Worker with cron triggers (health checks run every minute)
- Apply database migrations

After deployment, visit your Worker URL (e.g., `https://pingflare.<your-subdomain>.workers.dev`) and complete the initial setup by creating an admin account.

## Manual Deployment

If you prefer manual deployment or want to customize the setup:

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Steps

```bash
# Clone the repository
git clone https://github.com/isala404/pingflare.git
cd pingflare

# Install dependencies
bun install

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create pingflare-db

# Update wrangler.toml with your database ID
# Replace the database_id value with the ID from the previous command

# Build the application
bun run build

# Apply database migrations and deploy
bun run deploy
```

### Configuration

Edit `wrangler.toml` to customize:

```toml
name = "pingflare"              # Worker name (becomes part of URL)
compatibility_date = "2024-12-01"

[[d1_databases]]
binding = "DB"
database_name = "pingflare-db"  # D1 database name
database_id = "your-database-id"  # From 'wrangler d1 create'

[triggers]
crons = ["*/1 * * * *"]         # Health check frequency (every minute)
```

## Local Development

```bash
# Install dependencies
bun install

# Start development server with local D1
bun run dev

# Run tests
bun test

# Type checking
bun run check

# Lint and format
bun lint
bun format
```

The dev server runs at `http://localhost:5173` with a local D1 database.

## Usage Guide

### Creating Your First Monitor

1. Log in to your Pingflare instance
2. Click **Add Monitor** or navigate to `/monitors/new`
3. Enter a name and select a group
4. Use the **Visual Builder** to configure your health check:
   - Add a step with the URL to monitor
   - Add assertions (e.g., status equals 200, response time < 500ms)
5. Save the monitor

### Setting Up Notifications

1. Navigate to **Notifications** in the menu
2. Add a notification channel:
   - **Slack**: Paste your incoming webhook URL
   - **Discord**: Paste your webhook URL
   - **Webhook**: Configure a custom HTTP endpoint
   - **Browser Push**: Enable directly from the page
3. Edit any monitor and configure which channels should be notified

### Creating a Public Status Page

1. Navigate to **Admin → Groups**
2. Create a group with a URL slug (e.g., `api` → `/status/api`)
3. Check **Public** to make it visible on the status page
4. Assign monitors to the group
5. Share your status page URL (e.g., `https://your-worker.workers.dev/status`)

### Script DSL Reference

Monitors use a JSON-based DSL for health checks. Example:

```json
{
	"steps": [
		{
			"name": "Check API",
			"method": "GET",
			"url": "https://api.example.com/health",
			"headers": {
				"Authorization": "Bearer ${token}"
			},
			"assertions": [
				{ "check": "status", "equals": 200 },
				{ "check": "responseTime", "lessThan": 500, "severity": "degraded" },
				{ "check": "json.status", "equals": "healthy", "severity": "down" }
			],
			"extract": {
				"version": "json.version"
			}
		}
	]
}
```

**Supported Assertions:**

- `equals`, `notEquals`, `contains`, `notContains`
- `matches` (regex)
- `greaterThan`, `lessThan`, `greaterOrEqual`, `lessOrEqual`
- `minLength`, `maxLength`, `hasLength`
- `hasKey`, `exists`

**Checkable Paths:**

- `status` — HTTP status code
- `responseTime` — Response time in milliseconds
- `body` — Raw response body
- `json.path.to.value` — JSON path (supports arrays: `json.items[0].id`)
- `headers.content-type` — Response headers

**Severity Levels:**

- `degraded` (default) — Service is slow or partially impaired
- `down` — Service is unavailable

## Architecture

Pingflare runs entirely on Cloudflare's edge:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   Worker    │──▶│     D1      │   │    Cron     │       │
│  │ (SvelteKit) │   │  (SQLite)   │   │  (1 min)    │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│         │                                    │              │
│         ▼                                    ▼              │
│  ┌─────────────┐                    ┌─────────────┐        │
│  │   Static    │                    │   Health    │        │
│  │   Assets    │                    │   Checks    │        │
│  └─────────────┘                    └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

- **Worker**: SvelteKit application handling dashboard, API, and status pages
- **D1**: SQLite database storing monitors, checks, users, incidents, and notifications
- **Cron**: Triggers health checks every minute via Cloudflare's cron triggers
- **Static Assets**: Pre-built frontend served from Cloudflare's edge

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Build**: Vite, esbuild
- **Language**: TypeScript

## Limitations

- **Free Tier Limits**: Cloudflare's free tier allows 100k requests/day and 10ms CPU/request
- **Monitor Count**: ~25 monitors recommended due to 50 subrequest limit per cron invocation
- **Check Frequency**: Minimum 1-minute intervals (Cloudflare cron limitation)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT

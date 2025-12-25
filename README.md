# Pingflare

Cloudflare-native uptime monitoring solution. Self-host your own status page with one-click deployment.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/supiri/pingflare)

## Features

- Monitor HTTP endpoints with custom health check scripts
- Visual script builder or JSON DSL for complex check sequences
- Multi-channel notifications (Slack, Discord, Webhook, Web Push)
- Public status pages with incident management
- Monitor groups with per-group status aggregation
- 90-day uptime history with daily aggregation
- Mobile-first responsive design with PWA support

## One-Click Deploy

Click the deploy button above to deploy your own instance. This will:

1. Fork the repository to your GitHub account
2. Provision a D1 database for storing monitors and check history
3. Provision a KV namespace for status caching
4. Deploy the Worker with cron triggers (health checks run every minute)
5. Apply database migrations automatically

After deployment, visit your Worker URL and complete the initial setup by creating an admin account.

## Local Development

```sh
# Install dependencies
bun install

# Start development server with local D1 and KV
bun run dev

# Run tests
bun test

# Lint and format
bun lint
bun format
```

## Build & Deploy

```sh
# Build for production (SvelteKit + Worker bundling)
bun run build

# Deploy to Cloudflare (applies migrations and deploys)
bun run deploy
```

## Architecture

Pingflare runs entirely on Cloudflare's edge network:

- **Worker**: SvelteKit app with integrated cron scheduler
- **D1**: SQLite database for monitors, checks, users, and incidents
- **KV**: Fast status cache with 5-minute TTL
- **Cron**: Health checks triggered every minute

## Tech Stack

- SvelteKit 2 with Svelte 5
- Tailwind CSS 4
- Cloudflare Workers with Static Assets
- D1 (SQLite) + KV
- TypeScript

## License

MIT

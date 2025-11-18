# Pingflare

Uptime monitoring system built to run natively within Cloudflare, powered by SvelteKit.

## Features

- 🚀 **SvelteKit** with Svelte 5 (using modern Runes API)
- 🎨 **Tailwind CSS v4** with forms and typography plugins
- 📱 **PWA Support** with push notifications
- 🔧 **TypeScript** for type safety
- ✨ **ESLint & Prettier** for code quality
- 🌐 **Node.js Adapter** for flexible deployment

## Prerequisites

- Node.js 18+
- npm or pnpm

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Code Quality

Run these commands before committing:

```bash
# Format code with Prettier
npm run format

# Lint with ESLint
npm run lint

# Type check with Svelte compiler
npm run check
```

## PWA Configuration

This project includes PWA support with:

- Offline functionality via service worker
- Push notification support
- App manifest for installability

### Testing PWA Features

1. Build the project: `npm run build`
2. Preview: `npm run preview`
3. Open Chrome DevTools > Application tab
4. Check Service Workers, Manifest, and Offline functionality

### Setting Up Push Notifications

To enable push notifications, you'll need to:

1. Generate VAPID keys for your application
2. Configure the keys in your environment
3. Update the service worker subscription logic

See `src/sw.ts` for the service worker implementation.

## Project Structure

```
pingflare/
├── src/
│   ├── lib/              # Shared components and utilities
│   ├── routes/           # SvelteKit routes (file-based routing)
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   └── layout.css
│   ├── sw.ts             # Service worker for PWA
│   ├── app.html          # HTML template
│   └── app.d.ts          # TypeScript declarations
├── static/               # Static assets
├── Agents.md             # Development guidelines (READ THIS!)
├── vite.config.ts        # Vite + PWA configuration
├── svelte.config.js      # SvelteKit configuration
├── tsconfig.json         # TypeScript configuration
└── package.json
```

## Development Guidelines

**Important**: Read [`Agents.md`](./Agents.md) for comprehensive development guidelines including:

- Svelte 5 runes usage ($state, $derived, $effect, $props)
- TypeScript best practices
- Tailwind CSS patterns
- PWA implementation details
- Code quality standards

## Deployment

This project uses `@sveltejs/adapter-node` and can be deployed to any Node.js hosting platform:

### Node.js Server

```bash
npm run build
node build
```

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "build"]
```

### Environment Variables

Create a `.env` file (see `.env.example` if available):

```env
PUBLIC_API_URL=https://your-api-url.com
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run Svelte type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Contributing

1. Read `Agents.md` for development standards
2. Follow Svelte 5 runes patterns
3. Use Tailwind CSS for styling
4. Run code quality checks before committing
5. Write TypeScript with proper types

## License

See [LICENSE](./LICENSE) file for details.

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

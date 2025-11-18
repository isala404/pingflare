# Agents.md - Development Guidelines for Pingflare

## Overview

This document provides comprehensive guidelines for AI agents and developers working on the Pingflare project. Follow these standards strictly to maintain code quality and consistency.

## Project Stack

- **Framework**: SvelteKit (latest version)
- **Svelte Version**: Svelte 5 with Runes
- **Styling**: Tailwind CSS v4 with plugins (forms, typography)
- **Language**: TypeScript
- **Adapter**: Node.js (@sveltejs/adapter-node)
- **PWA**: Vite PWA Plugin with push notification support
- **Code Quality**: ESLint + Prettier

## Svelte 5 Standards

### Using Runes (MANDATORY)

Svelte 5 introduces runes as the new way to declare reactive state. **Always use runes instead of legacy syntax.**

#### State Management with $state

```svelte
<script lang="ts">
	// ✅ CORRECT - Use $state rune
	let count = $state(0);
	let user = $state({ name: 'John', age: 30 });

	// ❌ WRONG - Don't use let without $state for reactive values
	let count = 0;
</script>
```

#### Derived State with $derived

```svelte
<script lang="ts">
	let count = $state(0);

	// ✅ CORRECT - Use $derived for computed values
	let doubled = $derived(count * 2);
	let isEven = $derived(count % 2 === 0);

	// ❌ WRONG - Don't use $: for reactive declarations
	$: doubled = count * 2;
</script>
```

#### Effects with $effect

```svelte
<script lang="ts">
	let count = $state(0);

	// ✅ CORRECT - Use $effect for side effects
	$effect(() => {
		console.log('Count changed:', count);
		// Cleanup function (optional)
		return () => {
			console.log('Cleaning up');
		};
	});

	// ❌ WRONG - Don't use $: for effects
	$: console.log('Count:', count);
</script>
```

#### Props with $props

```svelte
<script lang="ts">
	// ✅ CORRECT - Use $props() for component props
	let {
		title,
		count = 0,
		onClick
	} = $props<{
		title: string;
		count?: number;
		onClick: () => void;
	}>();

	// ❌ WRONG - Don't use export let
	export let title: string;
	export let count = 0;
</script>
```

#### Bindable Props with $bindable

```svelte
<script lang="ts">
	// ✅ CORRECT - Use $bindable for two-way binding
	let { value = $bindable(0) } = $props<{
		value?: number;
	}>();

	// ❌ WRONG - Don't use export let with bind:
	export let value = 0;
</script>
```

#### Snippets (replacing slots)

```svelte
<!-- Parent Component -->
<script lang="ts">
  import Child from './Child.svelte';
</script>

{#snippet header()}
  <h1>Custom Header</h1>
{/snippet}

{#snippet footer()}
  <p>Custom Footer</p>
{/snippet}

<Child {header} {footer} />

<!-- Child Component -->
<script lang="ts">
  let { header, footer } = $props<{
    header?: import('svelte').Snippet;
    footer?: import('svelte').Snippet;
  }>();
</script>

{#if header}
  {@render header()}
{/if}

<main>
  <!-- content -->
</main>

{#if footer}
  {@render footer()}
{/if}
```

### Event Handlers

```svelte
<script lang="ts">
	// ✅ CORRECT - Use onclick (lowercase) for DOM events
	function handleClick() {
		console.log('Clicked!');
	}
</script>

<button onclick={handleClick}>Click me</button>

<!-- ❌ WRONG - Don't use on:click -->
<button on:click={handleClick}>Click me</button>
```

### Component Events

```svelte
<!-- Parent -->
<script lang="ts">
  import Child from './Child.svelte';

  function handleCustomEvent(detail: string) {
    console.log('Event received:', detail);
  }
</script>

<Child onCustomEvent={handleCustomEvent} />

<!-- Child -->
<script lang="ts">
  let { onCustomEvent } = $props<{
    onCustomEvent?: (detail: string) => void;
  }>();

  function triggerEvent() {
    onCustomEvent?.('some data');
  }
</script>

<button onclick={triggerEvent}>Trigger</button>
```

## TypeScript Standards

### Type Definitions

- Always provide explicit types for function parameters and return values
- Use interfaces for object shapes
- Use type for unions and intersections
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// ✅ CORRECT
interface User {
	id: string;
	name: string;
	email: string;
}

function getUser(id: string): Promise<User> {
	return fetch(`/api/users/${id}`).then((r) => r.json());
}

// ❌ WRONG
function getUser(id) {
	return fetch(`/api/users/${id}`).then((r) => r.json());
}
```

### SvelteKit Types

```typescript
// +page.ts or +page.server.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	return {
		user: await getUser(params.id)
	};
};
```

## Tailwind CSS Standards

### Using Tailwind Classes

- Use Tailwind utility classes for all styling
- Avoid custom CSS when Tailwind utilities are available
- Use the `@apply` directive sparingly, only for repeated patterns
- Leverage Tailwind plugins (forms, typography) when applicable

```svelte
<!-- ✅ CORRECT -->
<div class="flex items-center justify-between rounded-lg bg-blue-500 p-4 shadow-md">
	<h2 class="text-xl font-bold text-white">Title</h2>
	<button class="rounded bg-white px-4 py-2 text-blue-500 hover:bg-gray-100"> Action </button>
</div>

<!-- ❌ WRONG - Don't use inline styles -->
<div style="display: flex; background: blue;">
	<h2 style="color: white;">Title</h2>
</div>
```

### Responsive Design

```svelte
<!-- Always consider mobile-first responsive design -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	<!-- cards -->
</div>
```

### Dark Mode (if needed)

```svelte
<div class="bg-white text-black dark:bg-gray-900 dark:text-white">Content</div>
```

## Code Quality Standards

### Running Quality Checks

**After EVERY code change, run these commands in order:**

1. **Format with Prettier**: `npm run format`
2. **Lint with ESLint**: `npm run lint`
3. **Type Check with Svelte Compiler**: `npm run check`
4. **Build**: `npm run build` (before committing major changes)

### ESLint and Prettier Configuration

- Follow the project's ESLint and Prettier configurations
- Do not disable linting rules without good reason
- If you must disable a rule, document why with a comment

```typescript
// ✅ Acceptable if there's a valid reason
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = await fetchLegacyAPI();

// ❌ Avoid broad disables
/* eslint-disable */
```

## PWA and Service Worker

### Service Worker (src/sw.ts)

- The service worker handles offline caching and push notifications
- Modify `src/sw.ts` to customize caching strategies
- Test PWA functionality in production mode: `npm run build && npm run preview`

### Push Notifications

```typescript
// Request notification permission
async function requestNotificationPermission() {
	if (!('Notification' in window)) {
		console.log('Notifications not supported');
		return false;
	}

	const permission = await Notification.requestPermission();
	return permission === 'granted';
}

// Subscribe to push notifications
async function subscribeToPush() {
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: '<your-vapid-public-key>'
	});

	// Send subscription to your server
	await fetch('/api/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(subscription)
	});
}
```

### Manifest Configuration

- Edit `vite.config.ts` to customize the PWA manifest
- Update app name, colors, and icons as needed

## Project Structure

```
pingflare/
├── src/
│   ├── lib/              # Shared components and utilities
│   │   ├── components/   # Reusable Svelte components
│   │   └── utils/        # Helper functions
│   ├── routes/           # SvelteKit routes (file-based routing)
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   └── api/          # API routes
│   ├── sw.ts             # Service worker for PWA
│   └── app.html          # HTML template
├── static/               # Static assets (icons, images)
├── vite.config.ts        # Vite configuration (includes PWA setup)
├── svelte.config.js      # SvelteKit configuration
├── tsconfig.json         # TypeScript configuration
├── eslint.config.js      # ESLint configuration
└── .prettierrc           # Prettier configuration
```

## File Naming Conventions

- **Routes**: Use lowercase with hyphens: `my-route/+page.svelte`
- **Components**: Use PascalCase: `MyComponent.svelte`
- **Utilities**: Use camelCase: `myHelper.ts`
- **Types**: Use PascalCase: `UserProfile.ts` or `types.ts`

## Git Commit Standards

- Use conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- Keep commits atomic and focused
- Run all quality checks before committing

## API Routes

```typescript
// src/routes/api/example/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const data = { message: 'Hello World' };
	return json(data);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	// Process body
	return json({ success: true });
};
```

## Environment Variables

```typescript
// Use SvelteKit's environment variables
import { env } from '$env/dynamic/private'; // Server-side only
import { env as publicEnv } from '$env/dynamic/public'; // Available in browser

// Prefix public env vars with PUBLIC_
// .env
// PRIVATE_API_KEY=secret
// PUBLIC_API_URL=https://api.example.com
```

## Testing PWA Features

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Test in browser:
# 1. Open DevTools > Application > Service Workers
# 2. Check "Offline" to test offline functionality
# 3. Application > Manifest to verify PWA configuration
# 4. Use Lighthouse to audit PWA score
```

## Common Patterns

### Loading States

```svelte
<script lang="ts">
	let loading = $state(false);
	let data = $state<User | null>(null);

	async function loadData() {
		loading = true;
		try {
			data = await fetchData();
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<p>Loading...</p>
{:else if data}
	<div>{data.name}</div>
{:else}
	<p>No data</p>
{/if}
```

### Form Handling

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';

	let formData = $state({
		email: '',
		password: ''
	});
</script>

<form method="POST" use:enhance>
	<input type="email" bind:value={formData.email} class="rounded border px-3 py-2" required />
	<input type="password" bind:value={formData.password} class="rounded border px-3 py-2" required />
	<button type="submit" class="rounded bg-blue-500 px-4 py-2 text-white"> Submit </button>
</form>
```

### Navigation

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	function navigateToHome() {
		goto('/');
	}

	// Access current route
	$effect(() => {
		console.log('Current path:', $page.url.pathname);
	});
</script>
```

## Performance Best Practices

1. Use `$derived` instead of `$effect` when you only need computed values
2. Avoid unnecessary reactivity - not everything needs to be reactive
3. Use `bind:` sparingly - prefer one-way data flow when possible
4. Lazy load components with dynamic imports
5. Optimize images and assets
6. Use proper caching strategies in service worker

## Accessibility

- Always include proper ARIA labels
- Ensure keyboard navigation works
- Use semantic HTML elements
- Test with screen readers
- Maintain proper color contrast (use Tailwind colors)

```svelte
<button
	class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
	aria-label="Close dialog"
	onclick={handleClose}
>
	Close
</button>
```

## Debugging

```typescript
// Use $inspect for debugging reactive state
let count = $state(0);
$inspect(count); // Logs whenever count changes

// Use breakpoints in browser DevTools
// Add debugger statement for quick debugging
$effect(() => {
	debugger; // Execution will pause here
	console.log('Effect running');
});
```

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/what-are-runes)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

## Summary Checklist

Before completing any task:

- [ ] Used Svelte 5 runes ($state, $derived, $effect, $props)
- [ ] Applied Tailwind CSS for all styling
- [ ] Included proper TypeScript types
- [ ] Ran `npm run format`
- [ ] Ran `npm run lint` (no errors)
- [ ] Ran `npm run check` (no errors)
- [ ] Tested in development mode
- [ ] Verified PWA functionality (if applicable)
- [ ] Added proper accessibility attributes
- [ ] Documented any complex logic

---

**Remember**: Quality over speed. Follow these guidelines strictly to maintain a clean, maintainable, and production-ready codebase.

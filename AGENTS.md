This document defines the behavior, coding principles, and workflow rules for the development agent. These rules are strict and must always be followed.

## File Handling

1. Only create `.md` files when explicitly requested, with the exception of `PLAN.md` as part of the task workflow.
2. Always maintain and update two root-level files:
   - `PROGRESS.md`: A compressed changelog of completed tasks. Updated after each task is finalized. Serves as a high-level project evolution log.
   - `MEMORIES.md`: The agent's long-term memory. Contains stack info, user preferences, project patterns, and domain context. Updated after a task is successfully completed or when new context is discovered.
3. Keep `PROGRESS.md` and `MEMORIES.md` dense, minimal, and character-efficient. No markdown formatting beyond bullet points. Separate sections with empty lines.
4. Always read `PROGRESS.md` and `MEMORIES.md` at the start of every new conversation (if they don't exist, bootstrap them after analyzing the codebase).
5. The `PLAN.md` file is temporary and must be removed upon successful completion of the task.

---

## Task Workflow: Plan-Driven Development

This workflow is mandatory for every new feature, bug fix, or significant code modification.

### Phase 1: Analysis & Planning

1. **Read Memory**: Check `MEMORIES.md` for existing stack info, preferences, and patterns. If stack information is missing, detect it by scanning for common configuration files and append detected stack, package manager, test framework, linter, and formatter to `MEMORIES.md`.

2. **Scope Definition**: When a task is given, ask clarifying questions to ensure requirements are fully understood. Do not proceed with ambiguous instructions.

3. **Codebase Scan**: Perform a thorough scan of all related files to understand context, architecture, and potential impact. Update `MEMORIES.md` with any architectural findings, patterns discovered, or context that future agents should know to avoid repeating this work.

4. **Create `PLAN.md`**: Create a temporary `PLAN.md` file in the root directory:

```
   # PLAN: [Brief Description of Task]

   Overall Goal: [Clear statement of what success looks like]

   ---

   ### Step 1: [Goal]
   - Goal: [What this step achieves]
   - Files: [Files to create/update]
   - Verify: [How to confirm completion—typically a unit test or compiler check]

   ### Step 2: [Goal]
   - Goal: [What this step achieves]
   - Files: [Files to create/update]
   - Verify: [How to confirm completion]

   ...

   ### Final Step: Cleanup & Validation
   - Goal: Run formatters and linters.
   - Verify: [Stack-specific commands] run without errors or warnings.
```

5. **Seek Approval**: After creating `PLAN.md`, stop and wait for explicit user approval before proceeding.

### Phase 2: Implementation & Verification

1. **Execute Step-by-Step**: Implement precisely as described, one step at a time.
2. **Verify Each Step**: Perform the verification action before moving to the next step.
3. **Surgical Precision**: Make extremely targeted changes. Do not touch, refactor, or update any code not directly relevant to the current task.

### Phase 3: Finalization

1. **Get Final Approval**: Present the completed result and request a final "green light."
2. **Update `MEMORIES.md`**: Record any new learnings, preferences, or patterns discovered.
3. **Update `PROGRESS.md`**: Add task entry with file changes and any flags.
4. **Cleanup**: Delete `PLAN.md`.
5. **Suggest Commit**: Provide a single-line git commit message in imperative mood. Do not run the commit.

## PROGRESS.md Format

Purpose: High-level project evolution log. One entry per completed task. Enables any reader to understand what changed and why over time.

```
Implemented account deletion endpoint DELETE /v2/account with R2 cleanup.
- Added `delete_all_user_files` to `src/services/storage.rs` for batch R2 deletion using ListObjectsV2/DeleteObjects.
- Database CASCADE deletes all related data (content, blobs, tags, content_tags, generated_content, user_traits).
- Added unit tests for deletion service in `src/services/storage_test.rs`.

Reworked POST /v2/contents endpoint to accept multipart/form-data with images.
- Modified `src/handlers/contents.rs` to parse multipart form data.
- Added `ImageProcessor` trait in `src/services/images.rs` for testable image handling.
- TODO: Add image size validation → implement when requirements clarified.
- TRADEOFF: Chose synchronous processing over queue → acceptable for MVP, revisit at scale.

Fixed race condition in session refresh logic.
- Added mutex lock in `src/auth/session.rs` around token refresh.
- WORKAROUND: Using coarse-grained lock → replace with per-session lock when performance requires.
- DEPRECATED: `refresh_token_v1` function → remove after v2.1 release.
```

Rules:

- Single sentence task summary in imperative mood, include endpoint/feature name
- Bullet points for file changes: `path/to/file.ext` with brief description of change
- Flags (TODO/ISSUE/WORKAROUND/TRADEOFF/DEPRECATED) only when applicable, always include resolution path
- Separate entries with empty line
- No headers, no dates

## MEMORIES.md Format

Purpose: Long-term memory for stack info, user preferences, project patterns, and domain context. Survives across all sessions.

```
Tooling
- Stack: TypeScript, Express, Jest, ESLint, Prettier
- Package manager: bun
- Test command: bun test
- Lint command: bun lint
- Format command: bun format
- Tunneling tool: cloudflared

Preferences
- Prefer early returns over nested conditionals
- Max line length 100 characters
- Use Result pattern for error handling, not exceptions
- snake_case for files, PascalCase for types, camelCase for functions
- Unit tests only, mock all external dependencies
- One assertion per test when possible
- Use `rg` as grep alternative and `bun` as node package manager

Coding Patterns
- Repository pattern for data access (see src/repositories/)
- Dependency injection via constructor, no service locators
- Request validation in middleware, not handlers
- All IDs are branded types (see src/types/branded.ts)
- Avoid: god objects, circular imports, string typing for IDs

Business Context
- Domain: e-commerce platform with multi-warehouse fulfillment
- Orders can have multiple shipments from different warehouses
- Inventory is eventually consistent, check availability at checkout
- Payment provider: Stripe, webhook timeout 30s, retry 3x

Miscellaneous
- Database: Postgres 18+, with sqlc
- Cache: In-memory cache, with expiration
- File storage: R2, with uuid-based keys grouped by user
- Auth: JWT with 15min access / 7day refresh tokens
```

Rules:

- No headers, group related items with empty lines
- Bullet points or single lines only, no prose
- Update incrementally, do not rewrite entire file
- Remove outdated entries when they no longer apply
- Stack info at top, preferences next, patterns, then domain context

## Universal Coding Principles

These principles apply regardless of language or framework.

1. Design for Unit Testability

Write code that is trivial to unit test in isolation. The agent writes **only unit tests**—never integration or end-to-end tests.

- **Inject dependencies**: Pass collaborators as parameters or constructor arguments. Never instantiate dependencies internally.
- **Use interfaces/traits/protocols**: Depend on abstractions, not concrete implementations.
- **Pure functions over stateful methods**: Given the same input, return the same output. No side effects.
- **Isolate I/O at the edges**: Business logic should be pure. Push file, network, and database calls to the outer layer.

```
// Bad: Untestable—creates its own dependency
class OrderService {
  process(orderId) {
    const db = new DatabaseClient()  // ❌ Hard-coded dependency
    return db.query(orderId)
  }
}

// Good: Testable—dependency is injected
class OrderService {
  constructor(db) { this.db = db }  // ✅ Injected
  process(orderId) {
    return this.db.query(orderId)
  }
}
```

2. Write Idiomatic Code

Leverage the language's type system, standard library, and common patterns. Code should look like it belongs in the ecosystem.

```
// Bad: C-style loop, manual indexing (in a language with iterators)
function findUser(users, name) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].name === name) {
      return users[i]
    }
  }
  return null
}

// Good: Idiomatic use of built-in methods
function findUser(users, name) {
  return users.find(user => user.name === name) ?? null
}
```

```rust
// Bad: Manual iteration in Rust
fn find_user<'a>(users: &'a [User], name: &str) -> Option<&'a User> {
    for i in 0..users.len() {
        if users[i].name == name {
            return Some(&users[i]);
        }
    }
    None
}

// Good: Idiomatic Rust
fn find_user<'a>(users: &'a [User], name: &str) -> Option<&'a User> {
    users.iter().find(|user| user.name == name)
}
```

3. Adhere to "Linus's Good Taste"

Favor simple, robust code over clever solutions. Prioritize straightforward logic that handles all cases uniformly, eliminating special-case handling which is a common source of bugs.

```
// Bad: Complex, with special-casing for head node
function removeFromList(list, value) {
  if (!list.head) return

  // Special case: head is the node to remove
  if (list.head.value === value) {
    list.head = list.head.next
    return
  }

  // General case: find and remove
  let prev = list.head
  while (prev.next) {
    if (prev.next.value === value) {
      prev.next = prev.next.next
      return
    }
    prev = prev.next
  }
}

// Good: Unified logic, no special cases
function removeFromList(list, value) {
  let cursor = { next: list.head }  // Virtual node before head
  const dummy = cursor

  while (cursor.next) {
    if (cursor.next.value === value) {
      cursor.next = cursor.next.next
      break
    }
    cursor = cursor.next
  }

  list.head = dummy.next
}
```

The principle: if you find yourself writing `if` statements to handle "edge cases" differently from the "normal case," step back and look for a data structure or algorithm that treats all cases the same.

4. Single Responsibility

Each function, class, or module should do exactly one thing. If you need the word "and" to describe what it does, split it.

5. Fail Fast and Explicitly

Validate inputs at boundaries. Return errors, don't throw exceptions for expected failures. Make invalid states unrepresentable through types.

```
// Bad: Silent failure
function getUser(id) {
  if (!id) return null  // ❌ Caller might not check
}

// Good: Explicit failure
function getUser(id) {
  if (!id) throw new ArgumentError("id is required")  // ✅ Fail loud
}

// Better: Type-enforced (where language supports)
function getUser(id: UserId): Result<User, NotFoundError>
```

6. Locality of Behavior

Code that changes together should live together. When reading a piece of code, all related logic should be visible without jumping across files.

- Co-locate types with their primary operations
- Keep related constants near their usage
- Avoid scattering a single feature across many modules

7. Explicit Over Implicit

- Name things precisely. Avoid abbreviations.
- Make control flow obvious. Avoid clever tricks.
- Prefer verbose clarity over terse obscurity.

8. Small Functions

Functions should be short enough to fit on one screen (~20-30 lines max). If longer, extract sub-functions with descriptive names.

9. Immutability by Default

Prefer `const`/`final`/`let` over mutable variables. Create new values instead of mutating existing ones. Mutation should be intentional and localized.

10. Avoid Premature Abstraction

Do not create abstractions until you have at least two concrete use cases. Duplication is cheaper than the wrong abstraction.

11. Meaningful Names

- Functions: verb + noun (`createOrder`, `validateInput`, `calculateTotal`)
- Booleans: `is`/`has`/`should` prefix (`isValid`, `hasPermission`)
- Collections: plural nouns (`users`, `orderItems`)
- Avoid generic names: `data`, `info`, `temp`, `result`, `handler`, `manager`, `utils`

12. Implement Structured Logging

Use structured logging with appropriate levels for observability. Include contextual fields, not string interpolation.

- `error`: Service-impacting failures requiring attention
- `warn`: Potential issues or handled transient errors
- `info`: Significant lifecycle events (startup, shutdown, request completed)
- `debug`: Detailed diagnostic information for troubleshooting

```
// Bad: Unstructured, hard to query
console.log(`User ${userId} failed to login: ${error.message}`)

// Good: Structured with context
logger.warn("login failed", {
  userId,
  reason: error.code,
  attempt: attemptCount
})
```

## Comments & Documentation

1. **Explain the why, not the what.** Code shows what. Comments show why.
2. **Delete commented-out code.** Use version control instead.
3. **Document public APIs.** Internal implementation needs fewer comments if code is clear.

```
// ✅ Good: Explains non-obvious reasoning
// Using insertion sort here because n < 10 in practice and it's faster for small arrays

// ❌ Bad: States the obvious
// Loop through users
for user in users { }
```

## Execution & Commands

DO NOT RUN, any commands which would do irreversible changes to the host system like,

- Install/Updating/Uninstalling system level packages
- Changing system level configurations
  You are encouraged, use tools (kubectl, git, gh, curl, ls, docker, etc.) as much as needed in READ ONLY to gather information.

---

## Svelte 5 & SvelteKit Standards

This project uses **Svelte 5** with runes and **SvelteKit** with the Node adapter. Follow these conventions strictly.

### Svelte 5 Runes (Mandatory)

Always use runes instead of legacy Svelte 4 patterns:

```svelte
<!-- ✅ CORRECT: Svelte 5 Runes -->
<script lang="ts">
	// Reactive state
	let count = $state(0);

	// Derived values
	let doubled = $derived(count * 2);

	// Props with defaults
	let { title, description = 'Default' } = $props<{ title: string; description?: string }>();

	// Side effects
	$effect(() => {
		console.log('Count changed:', count);
	});
</script>
```

```svelte
<!-- ❌ WRONG: Legacy Svelte 4 patterns -->
<script lang="ts">
	// Don't use these
	export let title; // Use $props() instead
	let count = 0; // Use $state() for reactive values
	$: doubled = count * 2; // Use $derived() instead
	$: {
		console.log(count);
	} // Use $effect() instead
</script>
```

### Component Structure

```svelte
<script lang="ts">
	// 1. Imports
	import Component from '$lib/components/Component.svelte';
	import { someStore } from '$lib/stores';

	// 2. Props
	let { data, children } = $props<{ data: PageData; children?: Snippet }>();

	// 3. State
	let loading = $state(false);
	let items = $state<Item[]>([]);

	// 4. Derived values
	let filteredItems = $derived(items.filter((i) => i.active));

	// 5. Effects
	$effect(() => {
		// Side effects here
	});

	// 6. Functions
	function handleClick() {
		loading = true;
	}
</script>

<!-- Template -->
<div class="container">
	{#if loading}
		<LoadingSpinner />
	{:else}
		{#each filteredItems as item (item.id)}
			<ItemCard {item} />
		{/each}
	{/if}
</div>

<!-- Scoped styles (prefer Tailwind) -->
<style>
	/* Only when Tailwind classes aren't sufficient */
</style>
```

### Snippets (Svelte 5 Slots Replacement)

```svelte
<!-- Parent component -->
<script lang="ts">
	import Card from '$lib/components/Card.svelte';
</script>

<Card>
	{#snippet header()}
		<h2>Title</h2>
	{/snippet}

	{#snippet default()}
		<p>Content goes here</p>
	{/snippet}
</Card>

<!-- Card.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { header, children }: { header?: Snippet; children?: Snippet } = $props();
</script>

<div class="card">
	{#if header}
		<div class="card-header">
			{@render header()}
		</div>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
```

### Event Handling (Svelte 5)

```svelte
<!-- ✅ CORRECT: Svelte 5 event handling -->
<button onclick={handleClick}>Click</button>
<input oninput={(e) => (value = e.currentTarget.value)} />
<form onsubmit={handleSubmit}>...</form>

<!-- ❌ WRONG: Legacy on:event directive -->
<button on:click={handleClick}>Click</button>
<input on:input={handleInput} />
```

### TypeScript & Props

```svelte
<script lang="ts">
	// Always type your props
	interface Props {
		title: string;
		count?: number;
		items: Array<{ id: string; name: string }>;
		onUpdate?: (value: string) => void;
	}

	let { title, count = 0, items, onUpdate }: Props = $props();
</script>
```

### Styling with Tailwind CSS

```svelte
<!-- ✅ CORRECT: Use Tailwind utility classes -->
<div class="flex items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-md">
	<h1 class="text-2xl font-bold text-gray-900">Title</h1>
	<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"> Action </button>
</div>

<!-- ❌ AVOID: Custom CSS when Tailwind works -->
<style>
	.container {
		display: flex;
		align-items: center;
	}
</style>
```

### SvelteKit Conventions

**File Structure:**

```
src/
├── lib/
│   ├── components/    # Reusable Svelte components
│   ├── server/        # Server-only code
│   ├── stores/        # Svelte stores
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript types
├── routes/
│   ├── +layout.svelte # Root layout
│   ├── +page.svelte   # Home page
│   └── api/           # API routes
└── app.html           # HTML template
```

**Load Functions:**

```typescript
// +page.server.ts - Server-side data loading
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const data = await fetch(`/api/items/${params.id}`);
	return {
		item: await data.json()
	};
};
```

**Form Actions:**

```typescript
// +page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name');

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		// Process and redirect
	}
};
```

### After Each Change

Run these commands after making changes:

```bash
bun run format      # Format with Prettier
bun run lint        # Run ESLint
bun run check       # Run Svelte compiler check
```

All three commands must pass without errors before considering a task complete.

### PWA & Push Notifications

This project is configured as a PWA with push notification support via `@vite-pwa/sveltekit`.

- Service worker is auto-generated
- Use `ReloadPrompt` component for update notifications
- Register for push notifications via service worker

---

## Summary

| Phase        | Actions                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Plan**     | Read memory → Detect stack if needed → Understand task → Scan codebase → Update memory → Create `PLAN.md` → Get approval |
| **Execute**  | Implement step-by-step → Verify each step → Keep changes surgical                                                        |
| **Code**     | Testable → Idiomatic → Good taste → Small functions → Explicit                                                           |
| **Svelte**   | Use runes (`$state`, `$derived`, `$props`, `$effect`) → Tailwind CSS → `onclick` not `on:click`                          |
| **Test**     | Unit tests only → Mock dependencies → Test behavior not implementation                                                   |
| **Verify**   | `bun run format` → `bun run lint` → `bun run check` → All must pass                                                      |
| **Finalize** | Get approval → Update `MEMORIES.md` → Update `PROGRESS.md` → Delete `PLAN.md` → Suggest commit message                   |

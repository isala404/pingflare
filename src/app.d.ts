// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { UserPublic } from '$lib/types/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: UserPublic | null;
			sessionId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				ASSETS: Fetcher;
				CRON_SECRET?: string;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};

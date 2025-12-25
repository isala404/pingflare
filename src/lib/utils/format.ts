/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms`;
	}
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m ${seconds % 60}s`;
	}
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
}

/**
 * Format a timestamp to a relative time string
 * Handles both ISO format (with T and Z) and SQLite format (space separator, no Z)
 * Shows: seconds (< 2min), minutes (< 1h), hours + minutes (< 1d), days + hours (>= 1d)
 */
export function formatTime(timestamp: string | null): string {
	if (!timestamp) return 'Never';

	// Normalize the timestamp: SQLite returns "YYYY-MM-DD HH:MM:SS" (UTC without Z)
	// Convert to proper ISO format by replacing space with T and adding Z if missing
	let normalized = timestamp;
	if (!timestamp.includes('T')) {
		normalized = timestamp.replace(' ', 'T');
	}
	if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.includes('-', 10)) {
		normalized += 'Z';
	}

	const date = new Date(normalized);
	if (isNaN(date.getTime())) return 'Invalid';

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);

	// Less than 2 minutes: show seconds
	if (diffSeconds < 120) {
		return `${diffSeconds}s ago`;
	}

	const diffMinutes = Math.floor(diffSeconds / 60);

	// Less than 1 hour: show minutes
	if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	const remainingMinutes = diffMinutes % 60;

	// Less than 24 hours: show hours and minutes
	if (diffHours < 24) {
		if (remainingMinutes === 0) {
			return `${diffHours}h ago`;
		}
		return `${diffHours}h ${remainingMinutes}m ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	const remainingHours = diffHours % 24;

	// Show days and hours
	if (remainingHours === 0) {
		return `${diffDays}d ago`;
	}
	return `${diffDays}d ${remainingHours}h ago`;
}

/**
 * Format response time in milliseconds
 */
export function formatResponseTime(ms: number | null): string {
	if (ms === null) return '-';
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format uptime percentage
 */
export function formatUptime(percentage: number | null): string {
	if (percentage === null) return '-';
	return `${percentage.toFixed(1)}%`;
}

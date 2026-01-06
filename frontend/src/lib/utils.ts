/**
 * Utility functions for APalysis frontend.
 */

/**
 * Format parameter count for display.
 */
export function formatParams(numParams: number): string {
	if (numParams >= 1_000_000_000) {
		return `${(numParams / 1_000_000_000).toFixed(1)}B`;
	}
	if (numParams >= 1_000_000) {
		return `${(numParams / 1_000_000).toFixed(1)}M`;
	}
	if (numParams >= 1_000) {
		return `${(numParams / 1_000).toFixed(1)}K`;
	}
	return `${numParams}`;
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	return str.slice(0, maxLen - 3) + '...';
}

/**
 * Generate a unique ID.
 */
export function generateId(): string {
	return Math.random().toString(36).substring(2, 11);
}

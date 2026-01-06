/**
 * API client for communicating with the APalysis backend (torchview-based).
 */

import type { TorchviewGraphData, TorchviewNode, ModelSummary } from './types';

// API base URL - in production this will be same origin
const API_BASE = '/api';

/**
 * Fetch wrapper with error handling.
 */
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		}
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
		throw new Error(error.detail || `HTTP ${response.status}`);
	}

	return response.json();
}

/**
 * Get the torchview graph data.
 */
export async function getGraph(): Promise<TorchviewGraphData> {
	return fetchJson<TorchviewGraphData>(`${API_BASE}/graph`);
}

/**
 * Get a summary of the model.
 */
export async function getModelSummary(): Promise<ModelSummary> {
	return fetchJson<ModelSummary>(`${API_BASE}/model/summary`);
}

/**
 * Get detailed information about a specific node.
 */
export async function getNodeDetails(nodeId: string): Promise<TorchviewNode> {
	return fetchJson<TorchviewNode>(`${API_BASE}/node/${encodeURIComponent(nodeId)}`);
}

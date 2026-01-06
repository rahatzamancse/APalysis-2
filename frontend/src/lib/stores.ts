/**
 * Svelte stores for APalysis state management.
 */

import { writable, derived } from 'svelte/store';
import type { TorchviewGraphData, LayoutData, TorchviewNode, ModelSummary } from './types';

/**
 * Current graph data from the API.
 */
export const graphData = writable<TorchviewGraphData | null>(null);

/**
 * Computed layout data for rendering.
 */
export const layoutData = writable<LayoutData | null>(null);

/**
 * Currently selected node ID.
 */
export const selectedNodeId = writable<string | null>(null);

/**
 * Details of the currently selected node.
 */
export const selectedNodeDetails = writable<TorchviewNode | null>(null);

/**
 * Model summary.
 */
export const modelSummary = writable<ModelSummary | null>(null);

/**
 * Whether the graph is currently loading.
 */
export const isLoading = writable<boolean>(false);

/**
 * Error message if something went wrong.
 */
export const errorMessage = writable<string | null>(null);

/**
 * Whether the details panel is open.
 */
export const isDetailsPanelOpen = writable<boolean>(false);

/**
 * Zoom level for the graph view.
 */
export const zoomLevel = writable<number>(1);

/**
 * Pan offset for the graph view.
 */
export const panOffset = writable<{ x: number; y: number }>({ x: 0, y: 0 });

/**
 * Derived store: whether we have any graph data.
 */
export const hasGraph = derived(graphData, ($graphData) => $graphData !== null);

/**
 * Derived store: number of visible nodes.
 */
export const nodeCount = derived(graphData, ($graphData) => $graphData?.nodes.length ?? 0);

/**
 * Derived store: number of visible edges.
 */
export const edgeCount = derived(graphData, ($graphData) => $graphData?.edges.length ?? 0);

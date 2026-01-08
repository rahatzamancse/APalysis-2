/**
 * Graph layout computation for torchview visualization.
 * Uses dagre for hierarchical DAG layout (similar to graphviz dot).
 * Outputs Svelte Flow compatible format with proper subflows (parent nodes).
 */

import dagre from 'dagre';
import { Position, MarkerType, type Node, type Edge } from '@xyflow/svelte';
import type { TorchviewGraphData, TorchviewNode, TorchviewEdge } from './types';

// Layout constants - configurable spacing parameters
const NODE_WIDTH = 200;
const NODE_HEIGHT = 160;

// Dagre layout options (equivalent to graphviz dot settings)
const RANK_SEP = 120; // Horizontal spacing between ranks/layers
const NODE_SEP = 60; // Vertical spacing between nodes in same rank
const EDGE_SEP = 20; // Minimum edge separation
const SUBGRAPH_PADDING = 40;

/** Svelte Flow node with custom data */
export interface FlowNode extends Node {
	data: {
		label: string;
		nodeType: string;
		depth: number;
		subgraph: string | null;
		// Tensor-specific
		tensorShape?: string | number[];
		isInput?: boolean;
		isOutput?: boolean;
		isAux?: boolean;
		// Function-specific
		inputShape?: unknown[];
		outputShape?: unknown[];
		typeName?: string;
		isContainer?: boolean;
	};
}

/** Svelte Flow edge */
export interface FlowEdge extends Edge {
	sourceHandle?: string;
	targetHandle?: string;
	data?: {
		count: number;
		isBackEdge: boolean;
	};
}

/** Layout result for Svelte Flow */
export interface FlowLayoutData {
	nodes: FlowNode[];
	edges: FlowEdge[];
	width: number;
	height: number;
}

/**
 * Get node dimensions based on type.
 */
function getNodeDimensions(_nodeType: string): { width: number; height: number } {
	// All node types (tensor, function) use BaseNode which has
	// min-width: 200px and min-height: 80px in CSS
	return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

/**
 * Safely get a number value, returning fallback if undefined/NaN
 */
function safeNum(value: number | undefined, fallback: number): number {
	if (value === undefined || value === null || isNaN(value)) {
		return fallback;
	}
	return value;
}

/**
 * Identify back edges (edges that create cycles) using DFS.
 */
function findBackEdges(nodes: TorchviewNode[], edges: TorchviewEdge[]): Set<string> {
	const outgoing = new Map<string, string[]>();

	for (const node of nodes) {
		outgoing.set(node.id, []);
	}

	for (const edge of edges) {
		const out = outgoing.get(edge.source);
		if (out) out.push(edge.target);
	}

	const backEdges = new Set<string>();
	const visited = new Set<string>();
	const inStack = new Set<string>();

	function dfs(nodeId: string) {
		visited.add(nodeId);
		inStack.add(nodeId);

		const neighbors = outgoing.get(nodeId) || [];
		for (const neighbor of neighbors) {
			if (inStack.has(neighbor)) {
				backEdges.add(`${nodeId}->${neighbor}`);
			} else if (!visited.has(neighbor)) {
				dfs(neighbor);
			}
		}

		inStack.delete(nodeId);
	}

	for (const node of nodes) {
		if (!visited.has(node.id)) {
			dfs(node.id);
		}
	}

	return backEdges;
}

/**
 * Compute layout for the torchview graph using dagre.
 * Returns Svelte Flow compatible nodes and edges with proper subflows.
 */
export function computeFlowLayout(graphData: TorchviewGraphData): FlowLayoutData {
	const { nodes, edges, subgraphs } = graphData;

	if (nodes.length === 0) {
		return {
			nodes: [],
			edges: [],
			width: 800,
			height: 600
		};
	}

	// Identify back edges
	const backEdges = findBackEdges(nodes, edges);

	// Create dagre graph with compound support for subgraphs
	const g = new dagre.graphlib.Graph({ compound: true });

	g.setGraph({
		rankdir: 'LR',
		nodesep: NODE_SEP,
		ranksep: RANK_SEP,
		edgesep: EDGE_SEP,
		marginx: 50,
		marginy: 50
	});

	g.setDefaultEdgeLabel(() => ({}));

	// Add subgraphs as compound nodes (sorted by depth - parents first)
	const sortedSubgraphEntries = Object.entries(subgraphs || {}).sort(
		([, a], [, b]) => (a.depth || 0) - (b.depth || 0)
	);

	for (const [sgId, sgInfo] of sortedSubgraphEntries) {
		g.setNode(sgId, {
			label: sgInfo.label,
			clusterLabelPos: 'top',
			paddingLeft: SUBGRAPH_PADDING,
			paddingRight: SUBGRAPH_PADDING,
			paddingTop: SUBGRAPH_PADDING + 24,
			paddingBottom: SUBGRAPH_PADDING
		});

		if (sgInfo.parent && subgraphs[sgInfo.parent]) {
			g.setParent(sgId, sgInfo.parent);
		}
	}

	// Add actual nodes
	for (const node of nodes) {
		const dims = getNodeDimensions(node.nodeType);
		g.setNode(node.id, {
			width: dims.width,
			height: dims.height,
			label: node.name
		});

		// Set parent to immediate subgraph
		if (node.subgraph && subgraphs && subgraphs[node.subgraph]) {
			g.setParent(node.id, node.subgraph);
		}
	}

	// Add edges (excluding back edges for layout)
	for (const edge of edges) {
		const isBackEdge = backEdges.has(`${edge.source}->${edge.target}`);
		if (!isBackEdge) {
			g.setEdge(edge.source, edge.target, { weight: edge.count || 1 });
		}
	}

	// Run dagre layout
	dagre.layout(g);

	// Store absolute positions for all nodes to compute relative positions
	const absolutePositions = new Map<string, { x: number; y: number; width: number; height: number }>();

	// First pass: compute absolute positions for all subgraphs
	for (const [sgId] of sortedSubgraphEntries) {
		const dagreNode = g.node(sgId);
		if (dagreNode) {
			const width = safeNum(dagreNode.width, 200);
			const height = safeNum(dagreNode.height, 100);
			absolutePositions.set(sgId, {
				x: safeNum(dagreNode.x, 0) - width / 2,
				y: safeNum(dagreNode.y, 0) - height / 2,
				width,
				height
			});
		}
	}

	// Second pass: compute absolute positions for all regular nodes
	for (const node of nodes) {
		const dagreNode = g.node(node.id);
		const dims = getNodeDimensions(node.nodeType);
		if (dagreNode) {
			absolutePositions.set(node.id, {
				x: safeNum(dagreNode.x, 0) - dims.width / 2,
				y: safeNum(dagreNode.y, 0) - dims.height / 2,
				width: dims.width,
				height: dims.height
			});
		} else {
			absolutePositions.set(node.id, {
				x: 0,
				y: 0,
				width: dims.width,
				height: dims.height
			});
		}
	}

	// Get all nodes (both subgraph parent nodes and actual nodes)
	const flowNodes: FlowNode[] = [];

	// Create parent nodes for subgraphs (sorted by depth for proper z-index)
	const sortedSubgraphsForNodes = Object.entries(subgraphs || {}).sort(
		([, a], [, b]) => (a.depth || 0) - (b.depth || 0)
	);

	for (const [sgId, sgInfo] of sortedSubgraphsForNodes) {
		const absPos = absolutePositions.get(sgId);
		if (!absPos) continue;

		// Get the immediate parent subgraph (if any)
		const parentId = sgInfo.parent && subgraphs[sgInfo.parent] ? sgInfo.parent : undefined;

		// Calculate position - if has parent, position is relative to parent
		let x = absPos.x;
		let y = absPos.y;

		if (parentId) {
			const parentAbsPos = absolutePositions.get(parentId);
			if (parentAbsPos) {
				x = absPos.x - parentAbsPos.x;
				y = absPos.y - parentAbsPos.y;
			}
		}

		flowNodes.push({
			id: sgId,
			type: 'group',
			position: { x: safeNum(x, 0), y: safeNum(y, 0) },
			parentId,
			// Constrain nested subgraphs within their parent
			extent: parentId ? 'parent' : undefined,
			style: `width: ${absPos.width}px; height: ${absPos.height}px;`,
			zIndex: -10, // Below edges (z-index: 5)
			data: {
				label: sgInfo.label,
				nodeType: 'group',
				depth: sgInfo.depth,
				subgraph: sgInfo.parent
			},
			width: absPos.width,
			height: absPos.height
		});
	}

	// Add actual nodes
	for (const node of nodes) {
		const absPos = absolutePositions.get(node.id);
		if (!absPos) continue;

		const dims = getNodeDimensions(node.nodeType);

		// Get the immediate parent subgraph (if any)
		const parentId = node.subgraph && subgraphs && subgraphs[node.subgraph] ? node.subgraph : undefined;

		// Calculate position - if has parent, position is relative to parent
		let x = absPos.x;
		let y = absPos.y;

		if (parentId) {
			const parentAbsPos = absolutePositions.get(parentId);
			if (parentAbsPos) {
				x = absPos.x - parentAbsPos.x;
				y = absPos.y - parentAbsPos.y;
			}
		}

		flowNodes.push({
			id: node.id,
			type: node.nodeType,
			position: { x: safeNum(x, 0), y: safeNum(y, 0) },
			parentId,
			// Constrain child nodes within their parent
			extent: parentId ? 'parent' : undefined,
			sourcePosition: Position.Right,
			targetPosition: Position.Left,
			zIndex: 10, // Above edges (z-index: 5)
			data: {
				label: node.name,
				nodeType: node.nodeType,
				depth: node.depth,
				subgraph: node.subgraph,
				tensorShape: node.tensorShape,
				isInput: node.isInput,
				isOutput: node.isOutput,
				isAux: node.isAux,
				inputShape: node.inputShape,
				outputShape: node.outputShape,
				typeName: node.typeName,
				isContainer: node.isContainer
			},
			width: dims.width,
			height: dims.height
		});
	}

	// Convert edges to Svelte Flow format
	const flowEdges: FlowEdge[] = edges.map((edge) => {
		const isBackEdge = backEdges.has(`${edge.source}->${edge.target}`);
		const label = edge.count > 1 ? `×${edge.count}` : undefined;

		return {
			id: `${edge.source}-${edge.target}`,
			source: edge.source,
			target: edge.target,
			sourceHandle: 'source',
			targetHandle: 'target',
			type: isBackEdge ? 'back' : 'default', // Use custom 'back' type for back edges
			animated: isBackEdge,
			zIndex: 5, // Above group nodes (-10), below regular nodes (10)
			label,
			labelStyle: label ? 'font-size: 11px; font-weight: 600; fill: #6b7280;' : undefined,
			labelBgStyle: label ? 'fill: white; fill-opacity: 0.9;' : undefined,
			labelBgPadding: label ? [4, 6] as [number, number] : undefined,
			labelBgBorderRadius: label ? 4 : undefined,
			markerEnd: {
				type: MarkerType.ArrowClosed,
				width: 20,
				height: 20,
				color: isBackEdge ? '#f97316' : '#9ca3af'
			},
			style: isBackEdge
				? 'stroke: #f97316; stroke-width: 2px;'
				: 'stroke: #9ca3af; stroke-width: 1.5px;',
			data: {
				count: edge.count,
				isBackEdge
			}
		};
	});

	// Compute total dimensions
	let maxX = 0;
	let maxY = 0;
	for (const pos of absolutePositions.values()) {
		maxX = Math.max(maxX, pos.x + pos.width);
		maxY = Math.max(maxY, pos.y + pos.height);
	}

	return {
		nodes: flowNodes,
		edges: flowEdges,
		width: Math.max(maxX + 100, 800),
		height: Math.max(maxY + 100, 600)
	};
}

/**
 * Format shape for display.
 */
export function formatShape(shape: unknown): string {
	if (!shape) return '';
	if (typeof shape === 'string') return shape;
	if (Array.isArray(shape)) {
		if (shape.length === 0) return '';
		if (Array.isArray(shape[0])) {
			return formatShape(shape[0]);
		}
		return `(${shape.join(', ')})`;
	}
	return String(shape);
}

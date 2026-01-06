/**
 * Graph layout computation for torchview visualization.
 * Uses dagre for hierarchical DAG layout (similar to graphviz dot).
 */

import dagre from 'dagre';
import type {
	TorchviewGraphData,
	TorchviewNode,
	TorchviewEdge,
	LayoutData,
	LayoutNode,
	LayoutEdge
} from './types';

// Re-export types for convenience
export type { LayoutData, LayoutNode, LayoutEdge } from './types';

// Layout constants - configurable spacing parameters
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;
const TENSOR_WIDTH = 160;
const TENSOR_HEIGHT = 60;

// Dagre layout options (equivalent to graphviz dot settings)
const RANK_SEP = 120; // Horizontal spacing between ranks/layers (was H_SPACING)
const NODE_SEP = 60; // Vertical spacing between nodes in same rank (was V_SPACING)
const EDGE_SEP = 20; // Minimum separation between edges
const SUBGRAPH_PADDING = 20;

/**
 * Get node dimensions based on type.
 */
function getNodeDimensions(node: TorchviewNode): { width: number; height: number } {
	if (node.nodeType === 'tensor') {
		return { width: TENSOR_WIDTH, height: TENSOR_HEIGHT };
	}
	return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

/**
 * Identify back edges (edges that create cycles) using DFS.
 */
function findBackEdges(nodes: TorchviewNode[], edges: TorchviewEdge[]): Set<string> {
	const outgoing = new Map<string, string[]>();

	// Initialize all nodes
	for (const node of nodes) {
		outgoing.set(node.id, []);
	}

	// Build adjacency
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
				// This edge creates a cycle - it's a back edge
				backEdges.add(`${nodeId}->${neighbor}`);
			} else if (!visited.has(neighbor)) {
				dfs(neighbor);
			}
		}

		inStack.delete(nodeId);
	}

	// Start DFS from all nodes to handle disconnected components
	for (const node of nodes) {
		if (!visited.has(node.id)) {
			dfs(node.id);
		}
	}

	return backEdges;
}

/**
 * Compute layout for the torchview graph using dagre.
 * Dagre implements a Sugiyama-style hierarchical layout similar to graphviz dot.
 */
export async function computeLayout(graphData: TorchviewGraphData): Promise<LayoutData> {
	const { nodes, edges, subgraphs } = graphData;

	if (nodes.length === 0) {
		return {
			nodes: [],
			edges: [],
			subgraphBoxes: {},
			width: 800,
			height: 600
		};
	}

	// Identify back edges (needed for edge styling and to avoid cycles in layout)
	const backEdges = findBackEdges(nodes, edges);

	// Create a new dagre graph
	const g = new dagre.graphlib.Graph({ compound: true });

	// Set graph options for left-to-right layout (like graphviz LR)
	g.setGraph({
		rankdir: 'LR', // Left to right layout
		nodesep: NODE_SEP, // Vertical spacing between nodes in same rank
		ranksep: RANK_SEP, // Horizontal spacing between ranks
		edgesep: EDGE_SEP, // Minimum edge separation
		marginx: 50, // Horizontal margin
		marginy: 50 // Vertical margin
	});

	// Default edge label (required by dagre)
	g.setDefaultEdgeLabel(() => ({}));

	// Add subgraphs as compound nodes (parents)
	// Sort by depth to ensure parents are added before children
	const sortedSubgraphEntries = Object.entries(subgraphs).sort(
		([, a], [, b]) => (a.depth || 0) - (b.depth || 0)
	);

	for (const [sgId, sgInfo] of sortedSubgraphEntries) {
		g.setNode(sgId, {
			label: sgInfo.label,
			clusterLabelPos: 'top',
			style: 'fill: transparent',
			// Subgraph padding
			paddingLeft: SUBGRAPH_PADDING,
			paddingRight: SUBGRAPH_PADDING,
			paddingTop: SUBGRAPH_PADDING + 20, // Extra for label
			paddingBottom: SUBGRAPH_PADDING
		});

		// Set parent relationship for nested subgraphs
		if (sgInfo.parent && subgraphs[sgInfo.parent]) {
			g.setParent(sgId, sgInfo.parent);
		}
	}

	// Add nodes with their dimensions
	for (const node of nodes) {
		const dims = getNodeDimensions(node);
		g.setNode(node.id, {
			width: dims.width,
			height: dims.height,
			label: node.name
		});

		// Set parent subgraph if exists
		if (node.subgraph && subgraphs[node.subgraph]) {
			g.setParent(node.id, node.subgraph);
		}
	}

	// Add edges (excluding back edges to avoid layout issues with cycles)
	for (const edge of edges) {
		const isBackEdge = backEdges.has(`${edge.source}->${edge.target}`);
		if (!isBackEdge) {
			g.setEdge(edge.source, edge.target, {
				weight: edge.count || 1
			});
		}
	}

	// Run the dagre layout algorithm
	dagre.layout(g);

	// Extract node positions from dagre
	const layoutNodes: LayoutNode[] = nodes.map((node) => {
		const dagreNode = g.node(node.id);
		const dims = getNodeDimensions(node);

		// Dagre returns center coordinates, convert to top-left
		const x = dagreNode ? dagreNode.x - dims.width / 2 : 0;
		const y = dagreNode ? dagreNode.y - dims.height / 2 : 0;

		return {
			...node,
			x,
			y,
			width: dims.width,
			height: dims.height
		};
	});

	// Create node lookup for edge computation
	const nodeMap = new Map<string, LayoutNode>();
	for (const node of layoutNodes) {
		nodeMap.set(node.id, node);
	}

	// Create layout edges with connection points
	const layoutEdges: LayoutEdge[] = edges
		.map((edge) => {
			const sourceNode = nodeMap.get(edge.source);
			const targetNode = nodeMap.get(edge.target);

			if (!sourceNode || !targetNode) {
				return null;
			}

			const isBackEdge = backEdges.has(`${edge.source}->${edge.target}`);

			if (isBackEdge) {
				// Back edge: route around the nodes
				const startX = sourceNode.x + sourceNode.width;
				const startY = sourceNode.y + sourceNode.height / 2;
				const endX = targetNode.x;
				const endY = targetNode.y + targetNode.height / 2;

				const loopOffset = 60;
				return {
					...edge,
					isBackEdge: true,
					points: [
						{ x: startX, y: startY },
						{ x: startX + loopOffset, y: startY },
						{ x: startX + loopOffset, y: Math.min(startY, endY) - loopOffset },
						{ x: endX - loopOffset, y: Math.min(startY, endY) - loopOffset },
						{ x: endX - loopOffset, y: endY },
						{ x: endX, y: endY }
					]
				};
			}

			// Normal forward edge: use dagre's edge points if available
			const dagreEdge = g.edge(edge.source, edge.target);
			if (dagreEdge && dagreEdge.points && dagreEdge.points.length > 0) {
				return {
					...edge,
					isBackEdge: false,
					points: dagreEdge.points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }))
				};
			}

			// Fallback: simple edge from right of source to left of target
			const startX = sourceNode.x + sourceNode.width;
			const startY = sourceNode.y + sourceNode.height / 2;
			const endX = targetNode.x;
			const endY = targetNode.y + targetNode.height / 2;

			return {
				...edge,
				isBackEdge: false,
				points: [
					{ x: startX, y: startY },
					{ x: endX, y: endY }
				]
			};
		})
		.filter((e): e is LayoutEdge => e !== null);

	// Compute subgraph bounding boxes from dagre or from contained nodes
	const childSubgraphs = new Map<string, Set<string>>();
	for (const [sgId, sgInfo] of Object.entries(subgraphs)) {
		if (sgInfo.parent) {
			if (!childSubgraphs.has(sgInfo.parent)) {
				childSubgraphs.set(sgInfo.parent, new Set());
			}
			childSubgraphs.get(sgInfo.parent)!.add(sgId);
		}
	}

	function getAllDescendantSubgraphs(sgId: string): Set<string> {
		const descendants = new Set<string>();
		const queue = [sgId];
		while (queue.length > 0) {
			const current = queue.shift()!;
			const children = childSubgraphs.get(current);
			if (children) {
				for (const child of children) {
					descendants.add(child);
					queue.push(child);
				}
			}
		}
		return descendants;
	}

	const subgraphBoxes: Record<
		string,
		{
			x: number;
			y: number;
			width: number;
			height: number;
			label: string;
			depth: number;
			parent: string | null;
		}
	> = {};

	// Sort subgraphs by depth (deepest first) for bottom-up box computation
	const sortedSubgraphsForBoxes = Object.entries(subgraphs).sort(
		([, a], [, b]) => (b.depth || 0) - (a.depth || 0)
	);

	for (const [sgId, sgInfo] of sortedSubgraphsForBoxes) {
		// Try to get dagre's computed position for the compound node
		const dagreSubgraph = g.node(sgId);

		if (dagreSubgraph && dagreSubgraph.width && dagreSubgraph.height) {
			// Use dagre's computed bounds (center coordinates)
			subgraphBoxes[sgId] = {
				x: dagreSubgraph.x - dagreSubgraph.width / 2,
				y: dagreSubgraph.y - dagreSubgraph.height / 2,
				width: dagreSubgraph.width,
				height: dagreSubgraph.height,
				label: sgInfo.label,
				depth: sgInfo.depth,
				parent: sgInfo.parent || null
			};
		} else {
			// Fallback: compute from contained nodes
			const directNodes = layoutNodes.filter((n) => n.subgraph === sgId);
			const descendants = getAllDescendantSubgraphs(sgId);
			const descendantNodes = layoutNodes.filter((n) => n.subgraph && descendants.has(n.subgraph));
			const allNodes = [...directNodes, ...descendantNodes];

			if (allNodes.length === 0) continue;

			const xs = allNodes.map((n) => n.x);
			const ys = allNodes.map((n) => n.y);
			const rights = allNodes.map((n) => n.x + n.width);
			const bottoms = allNodes.map((n) => n.y + n.height);

			let minX = Math.min(...xs);
			let minY = Math.min(...ys);
			let maxX = Math.max(...rights);
			let maxY = Math.max(...bottoms);

			// Include child subgraph boxes
			const childSgs = childSubgraphs.get(sgId);
			if (childSgs) {
				for (const childId of childSgs) {
					const childBox = subgraphBoxes[childId];
					if (childBox) {
						minX = Math.min(minX, childBox.x);
						minY = Math.min(minY, childBox.y);
						maxX = Math.max(maxX, childBox.x + childBox.width);
						maxY = Math.max(maxY, childBox.y + childBox.height);
					}
				}
			}

			const depthPadding = SUBGRAPH_PADDING + (5 - Math.min(sgInfo.depth || 1, 5)) * 4;

			subgraphBoxes[sgId] = {
				x: minX - depthPadding,
				y: minY - depthPadding - 18,
				width: maxX - minX + depthPadding * 2,
				height: maxY - minY + depthPadding * 2 + 18,
				label: sgInfo.label,
				depth: sgInfo.depth,
				parent: sgInfo.parent || null
			};
		}
	}

	// Compute total dimensions
	let maxX = 0;
	let maxY = 0;
	for (const node of layoutNodes) {
		maxX = Math.max(maxX, node.x + node.width);
		maxY = Math.max(maxY, node.y + node.height);
	}

	for (const box of Object.values(subgraphBoxes)) {
		maxX = Math.max(maxX, box.x + box.width);
		maxY = Math.max(maxY, box.y + box.height);
	}

	return {
		nodes: layoutNodes,
		edges: layoutEdges,
		subgraphBoxes,
		width: maxX + 100,
		height: maxY + 100
	};
}

/**
 * Generate SVG path for an edge using cubic bezier curves.
 */
export function generateEdgePath(edge: LayoutEdge): string {
	if (!edge.points || edge.points.length < 2) return '';

	const points = edge.points;
	const start = points[0];
	const end = points[points.length - 1];

	// For back edges or edges with multiple control points from dagre
	if (edge.isBackEdge || points.length > 2) {
		// Use smooth path through all points
		if (points.length === 2) {
			return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
		}

		// Create a smooth curve through dagre's edge points
		let path = `M ${start.x} ${start.y}`;

		if (points.length === 3) {
			// Quadratic bezier for 3 points
			const mid = points[1];
			path += ` Q ${mid.x} ${mid.y}, ${end.x} ${end.y}`;
		} else {
			// For more points, use a series of curves
			for (let i = 1; i < points.length - 1; i++) {
				const p = points[i];
				const next = points[i + 1];
				if (i === points.length - 2) {
					// Last segment: curve to end
					path += ` Q ${p.x} ${p.y}, ${next.x} ${next.y}`;
				} else {
					// Intermediate: line to midpoint
					const midX = (p.x + next.x) / 2;
					const midY = (p.y + next.y) / 2;
					path += ` Q ${p.x} ${p.y}, ${midX} ${midY}`;
				}
			}
		}

		return path;
	}

	// Simple 2-point edge: cubic bezier S-curve
	const dx = end.x - start.x;
	const midX = start.x + dx * 0.5;

	return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
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
			// Nested array - take first element
			return formatShape(shape[0]);
		}
		return `(${shape.join(', ')})`;
	}
	return String(shape);
}

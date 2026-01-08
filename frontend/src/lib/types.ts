/**
 * Type definitions for APalysis frontend (torchview-based visualization).
 */

/** Node types from torchview */
export type NodeType = 'tensor' | 'function' | 'unknown';

/** A node in the torchview graph */
export interface TorchviewNode {
	id: string;
	name: string;
	nodeType: NodeType;
	depth: number;
	subgraph: string | null;
	subgraphLabel: string | null;

	// Tensor-specific
	tensorShape?: string | number[];
	isInput?: boolean;
	isOutput?: boolean;
	isAux?: boolean;

	// Module/Function-specific
	inputShape?: unknown[];
	outputShape?: unknown[];
	typeName?: string;
	isContainer?: boolean;
}

/** An edge in the torchview graph */
export interface TorchviewEdge {
	source: string;
	target: string;
	count: number;
}

/** Subgraph (module group) information */
export interface Subgraph {
	label: string;
	parent: string | null;
	moduleName: string;
	moduleType: string;
	depth: number;
}

/** The complete graph data from the API */
export interface TorchviewGraphData {
	nodes: TorchviewNode[];
	edges: TorchviewEdge[];
	subgraphs: Record<string, Subgraph>;
	error?: string;
}

/** Model summary from the API */
export interface ModelSummary {
	name: string;
	class: string;
	total_parameters: number;
	total_layers: number;
}

/** Layout node with computed positions */
export interface LayoutNode extends TorchviewNode {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Layout edge with computed path */
export interface LayoutEdge extends TorchviewEdge {
	points: Array<{ x: number; y: number }>;
	isBackEdge: boolean;
}

/** Subgraph bounding box with hierarchy info */
export interface SubgraphBox {
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
	depth: number;
	parent: string | null;
}

/** Computed layout data */
export interface LayoutData {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	subgraphBoxes: Record<string, SubgraphBox>;
	width: number;
	height: number;
}

/** Node color configuration by type */
export interface NodeColorConfig {
	background: string;
	border: string;
	text: string;
	headerBg: string;
}

/** Node colors for each type */
export const NODE_COLORS: Record<NodeType, NodeColorConfig> = {
	tensor: {
		background: '#FFFEF0',
		border: '#E6B800',
		text: '#8B7500',
		headerBg: '#FFF9D6'
	},
	function: {
		background: '#F0F8FF',
		border: '#4169E1',
		text: '#2B4A8C',
		headerBg: '#E0EFFF'
	},
	unknown: {
		background: '#F8F9FA',
		border: '#6C757D',
		text: '#495057',
		headerBg: '#E9ECEF'
	}
};

export const LAYER_COLORS: Record<string, NodeColorConfig> = {
	'Conv2d': {
		background: '#E0F2F1', // Teal 50
		border: '#009688',     // Teal 500
		text: '#00695C',       // Teal 800
		headerBg: '#B2DFDB'    // Teal 100
	},
	'Linear': {
		background: '#EDE7F6', // Deep Purple 50
		border: '#673AB7',     // Deep Purple 500
		text: '#4527A0',       // Deep Purple 800
		headerBg: '#D1C4E9'    // Deep Purple 100
	},
	'BatchNorm2d': {
		background: '#FFF3E0', // Orange 50
		border: '#FF9800',     // Orange 500
		text: '#E65100',       // Orange 800
		headerBg: '#FFE0B2'    // Orange 100
	},
	'ReLU': {
		background: '#FFEBEE', // Red 50
		border: '#F44336',     // Red 500
		text: '#B71C1C',       // Red 800
		headerBg: '#FFCDD2'    // Red 100
	},
	'MaxPool2d': {
		background: '#E3F2FD', // Blue 50
		border: '#2196F3',     // Blue 500
		text: '#0D47A1',       // Blue 800
		headerBg: '#BBDEFB'    // Blue 100
	},
	'Dropout': {
		background: '#F3E5F5', // Purple 50
		border: '#9C27B0',     // Purple 500
		text: '#4A148C',       // Purple 800
		headerBg: '#E1BEE7'    // Purple 100
	}
};

export function getLayerColor(typeName: string | undefined): NodeColorConfig {
	if (!typeName) return NODE_COLORS.function;
	
	// Direct match
	if (LAYER_COLORS[typeName]) return LAYER_COLORS[typeName];
	
	// Fuzzy matching or defaults
	if (typeName.includes('Conv')) return LAYER_COLORS['Conv2d'];
	if (typeName.includes('Linear')) return LAYER_COLORS['Linear'];
	if (typeName.includes('Norm')) return LAYER_COLORS['BatchNorm2d'];
	if (typeName.includes('ReLU') || typeName.includes('SiLU') || typeName.includes('GELU')) return LAYER_COLORS['ReLU'];
	if (typeName.includes('Pool')) return LAYER_COLORS['MaxPool2d'];
	if (typeName.includes('Dropout')) return LAYER_COLORS['Dropout'];
	
	return NODE_COLORS.function;
}

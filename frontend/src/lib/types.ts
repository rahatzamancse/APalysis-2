/**
 * Type definitions for APalysis frontend (torchview-based visualization).
 */

/** Node types from torchview */
export type NodeType = 'tensor' | 'module' | 'function' | 'unknown';

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
	isActivation?: boolean;
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

/** Settings from torchview */
export interface GraphSettings {
	show_shapes?: boolean;
	expand_nested?: boolean;
	hide_inner_tensors?: boolean;
	hide_module_functions?: boolean;
	depth?: number;
	roll?: boolean;
}

/** The complete graph data from the API */
export interface TorchviewGraphData {
	nodes: TorchviewNode[];
	edges: TorchviewEdge[];
	subgraphs: Record<string, Subgraph>;
	settings: GraphSettings;
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
	module: {
		background: '#F0FFF4',
		border: '#2E8B57',
		text: '#1D5C38',
		headerBg: '#E0FFE8'
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

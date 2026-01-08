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

/** Layer type color configuration for function nodes */
export const LAYER_TYPE_COLORS: Record<string, NodeColorConfig> = {
	// Convolution layers - Blue shades
	conv2d: {
		background: '#EBF5FF',
		border: '#3B82F6',
		text: '#1E40AF',
		headerBg: '#DBEAFE'
	},
	conv1d: {
		background: '#E0F2FE',
		border: '#0EA5E9',
		text: '#0369A1',
		headerBg: '#BAE6FD'
	},
	conv3d: {
		background: '#E0E7FF',
		border: '#6366F1',
		text: '#3730A3',
		headerBg: '#C7D2FE'
	},
	// Activation functions - Green/Teal shades
	relu: {
		background: '#ECFDF5',
		border: '#10B981',
		text: '#047857',
		headerBg: '#D1FAE5'
	},
	leaky_relu: {
		background: '#F0FDF4',
		border: '#22C55E',
		text: '#15803D',
		headerBg: '#DCFCE7'
	},
	gelu: {
		background: '#CCFBF1',
		border: '#14B8A6',
		text: '#0F766E',
		headerBg: '#99F6E4'
	},
	sigmoid: {
		background: '#D1FAE5',
		border: '#059669',
		text: '#065F46',
		headerBg: '#A7F3D0'
	},
	tanh: {
		background: '#CFFAFE',
		border: '#06B6D4',
		text: '#0E7490',
		headerBg: '#A5F3FC'
	},
	softmax: {
		background: '#F0FDFA',
		border: '#2DD4BF',
		text: '#0D9488',
		headerBg: '#CCFBF1'
	},
	silu: {
		background: '#E0FFF4',
		border: '#34D399',
		text: '#059669',
		headerBg: '#A7F3D0'
	},
	// Normalization layers - Purple shades
	batch_norm: {
		background: '#FAF5FF',
		border: '#A855F7',
		text: '#7E22CE',
		headerBg: '#F3E8FF'
	},
	batchnorm2d: {
		background: '#FAF5FF',
		border: '#A855F7',
		text: '#7E22CE',
		headerBg: '#F3E8FF'
	},
	layer_norm: {
		background: '#FDF4FF',
		border: '#D946EF',
		text: '#A21CAF',
		headerBg: '#FAE8FF'
	},
	layernorm: {
		background: '#FDF4FF',
		border: '#D946EF',
		text: '#A21CAF',
		headerBg: '#FAE8FF'
	},
	group_norm: {
		background: '#F5F3FF',
		border: '#8B5CF6',
		text: '#6D28D9',
		headerBg: '#EDE9FE'
	},
	instance_norm: {
		background: '#EEF2FF',
		border: '#818CF8',
		text: '#4F46E5',
		headerBg: '#E0E7FF'
	},
	// Pooling layers - Orange/Amber shades
	max_pool: {
		background: '#FFF7ED',
		border: '#F97316',
		text: '#C2410C',
		headerBg: '#FFEDD5'
	},
	maxpool2d: {
		background: '#FFF7ED',
		border: '#F97316',
		text: '#C2410C',
		headerBg: '#FFEDD5'
	},
	avg_pool: {
		background: '#FFFBEB',
		border: '#F59E0B',
		text: '#B45309',
		headerBg: '#FEF3C7'
	},
	avgpool2d: {
		background: '#FFFBEB',
		border: '#F59E0B',
		text: '#B45309',
		headerBg: '#FEF3C7'
	},
	adaptive_avg_pool: {
		background: '#FEF9C3',
		border: '#EAB308',
		text: '#A16207',
		headerBg: '#FEF08A'
	},
	adaptiveavgpool2d: {
		background: '#FEF9C3',
		border: '#EAB308',
		text: '#A16207',
		headerBg: '#FEF08A'
	},
	// Linear/Dense layers - Indigo shades
	linear: {
		background: '#EEF2FF',
		border: '#6366F1',
		text: '#4338CA',
		headerBg: '#E0E7FF'
	},
	dense: {
		background: '#EEF2FF',
		border: '#6366F1',
		text: '#4338CA',
		headerBg: '#E0E7FF'
	},
	// Dropout - Red/Rose shades
	dropout: {
		background: '#FFF1F2',
		border: '#F43F5E',
		text: '#BE123C',
		headerBg: '#FFE4E6'
	},
	// Embedding - Cyan shades
	embedding: {
		background: '#ECFEFF',
		border: '#22D3EE',
		text: '#0891B2',
		headerBg: '#CFFAFE'
	},
	// Attention - Pink shades
	attention: {
		background: '#FDF2F8',
		border: '#EC4899',
		text: '#BE185D',
		headerBg: '#FCE7F3'
	},
	multiheadattention: {
		background: '#FDF2F8',
		border: '#EC4899',
		text: '#BE185D',
		headerBg: '#FCE7F3'
	},
	// Flatten/Reshape - Slate shades
	flatten: {
		background: '#F8FAFC',
		border: '#64748B',
		text: '#334155',
		headerBg: '#F1F5F9'
	},
	reshape: {
		background: '#F8FAFC',
		border: '#64748B',
		text: '#334155',
		headerBg: '#F1F5F9'
	},
	view: {
		background: '#F8FAFC',
		border: '#64748B',
		text: '#334155',
		headerBg: '#F1F5F9'
	},
	// Math operations - Stone shades
	add: {
		background: '#FAFAF9',
		border: '#78716C',
		text: '#44403C',
		headerBg: '#F5F5F4'
	},
	mul: {
		background: '#FAFAF9',
		border: '#78716C',
		text: '#44403C',
		headerBg: '#F5F5F4'
	},
	matmul: {
		background: '#FAFAF9',
		border: '#78716C',
		text: '#44403C',
		headerBg: '#F5F5F4'
	},
	cat: {
		background: '#FAFAF9',
		border: '#78716C',
		text: '#44403C',
		headerBg: '#F5F5F4'
	},
	concat: {
		background: '#FAFAF9',
		border: '#78716C',
		text: '#44403C',
		headerBg: '#F5F5F4'
	}
};

/** Get color config for a layer type, with fallback to default function color */
export function getLayerTypeColor(layerType: string | undefined): NodeColorConfig {
	if (!layerType) return NODE_COLORS.function;
	
	// Normalize the layer type: lowercase and replace common variations
	const normalized = layerType
		.toLowerCase()
		.replace(/[-\s]/g, '_')
		.replace(/^nn\./, '')
		.replace(/^torch\./, '');
	
	// Try exact match first
	if (LAYER_TYPE_COLORS[normalized]) {
		return LAYER_TYPE_COLORS[normalized];
	}
	
	// Try partial matches for common patterns
	for (const [key, color] of Object.entries(LAYER_TYPE_COLORS)) {
		if (normalized.includes(key) || key.includes(normalized)) {
			return color;
		}
	}
	
	// Default fallback
	return NODE_COLORS.function;
}

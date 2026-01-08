<script lang="ts">
	import { untrack } from 'svelte';
	import {
		SvelteFlow,
		Controls,
		Background,
		BackgroundVariant,
		type NodeTypes,
		type EdgeTypes
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import { TensorNode, FunctionNode, GroupNode } from './nodes';
	import BackEdge from './edges/BackEdge.svelte';
	import type { FlowLayoutData, FlowNode, FlowEdge } from '$lib/layout';
	import { NODE_COLORS, LAYER_TYPE_COLORS } from '$lib/types';

	interface Props {
		layoutData: FlowLayoutData;
		selectedNodeId: string | null;
		onNodeSelect: (nodeId: string) => void;
		onBackgroundClick: () => void;
	}

	let { layoutData, selectedNodeId, onNodeSelect, onBackgroundClick }: Props = $props();

	// Svelte Flow state - use $state.raw for performance
	let nodes = $state.raw<FlowNode[]>([]);
	let edges = $state.raw<FlowEdge[]>([]);

	// Track the last layoutData to detect actual changes
	let lastLayoutDataRef: FlowLayoutData | null = null;

	// Only update nodes/edges when layoutData actually changes (not on selection change)
	$effect(() => {
		// Only re-initialize if layoutData reference changed (new graph data)
		if (layoutData !== lastLayoutDataRef && layoutData.nodes.length > 0) {
			lastLayoutDataRef = layoutData;
			// Read selectedNodeId without creating dependency using untrack
			const currentSelection = untrack(() => selectedNodeId);
			nodes = layoutData.nodes.map((node) => ({
				...node,
				selected: node.id === currentSelection
			}));
			edges = layoutData.edges;
		}
	});

	// Separate effect for selection changes - update only the selected property, preserve positions
	$effect(() => {
		// Track only selectedNodeId, read nodes without tracking to avoid circular dependency
		const newSelectedId = selectedNodeId;
		const currentNodes = untrack(() => nodes);
		
		if (currentNodes.length > 0) {
			// Only update selection state, preserving all positions
			nodes = currentNodes.map((node) => ({
				...node,
				selected: node.id === newSelectedId
			}));
		}
	});

	// Only render if we have nodes
	const hasNodes = $derived(layoutData.nodes.length > 0);

	// Custom node types including group nodes for subflows
	const nodeTypes: NodeTypes = {
		tensor: TensorNode,
		function: FunctionNode,
		group: GroupNode
	};

	// Custom edge types for back edges that curve upward
	const edgeTypes: EdgeTypes = {
		back: BackEdge
	};

	// Handle node clicks
	function handleNodeClick({ node }: { node: FlowNode; event: MouseEvent | TouchEvent }) {
		// Don't select group nodes
		if (node.type !== 'group') {
			onNodeSelect(node.id);
		}
	}

	// Handle pane clicks (background)
	function handlePaneClick() {
		onBackgroundClick();
	}

	// Handle selection change
	function handleSelectionChange({ nodes: selectedNodes }: { nodes: FlowNode[]; edges: FlowEdge[] }) {
		const filteredNodes = selectedNodes.filter((n) => n.type !== 'group');
		if (filteredNodes.length > 0) {
			onNodeSelect(filteredNodes[0].id);
		}
	}
</script>

<div class="graph-container">
	{#if hasNodes}
		<SvelteFlow
			bind:nodes
			bind:edges
			{nodeTypes}
			{edgeTypes}
			fitView
			fitViewOptions={{ padding: 0.2 }}
			minZoom={0.1}
			maxZoom={4}
			defaultEdgeOptions={{
				type: 'default'
			}}
			onpaneclick={handlePaneClick}
			onnodeclick={handleNodeClick}
			onselectionchange={handleSelectionChange}
		>
			<Controls />
			<Background variant={BackgroundVariant.Dots} gap={20} size={1} />
		</SvelteFlow>
	{:else}
		<div class="empty-state">
			<p>Loading graph...</p>
		</div>
	{/if}

	<!-- Legend -->
	<div class="legend">
		<div class="legend-title">Layer Types</div>
		<div class="legend-items">
			<!-- Convolution -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.conv2d.background}; border-color: {LAYER_TYPE_COLORS.conv2d.border};"
				></span>
				<span>Conv</span>
			</div>
			<!-- Activation -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.relu.background}; border-color: {LAYER_TYPE_COLORS.relu.border};"
				></span>
				<span>Activation</span>
			</div>
			<!-- Normalization -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.batch_norm.background}; border-color: {LAYER_TYPE_COLORS.batch_norm.border};"
				></span>
				<span>Norm</span>
			</div>
			<!-- Pooling -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.max_pool.background}; border-color: {LAYER_TYPE_COLORS.max_pool.border};"
				></span>
				<span>Pool</span>
			</div>
			<!-- Linear -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.linear.background}; border-color: {LAYER_TYPE_COLORS.linear.border};"
				></span>
				<span>Linear</span>
			</div>
			<!-- Dropout -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.dropout.background}; border-color: {LAYER_TYPE_COLORS.dropout.border};"
				></span>
				<span>Dropout</span>
			</div>
			<!-- Attention -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {LAYER_TYPE_COLORS.attention.background}; border-color: {LAYER_TYPE_COLORS.attention.border};"
				></span>
				<span>Attention</span>
			</div>
			<!-- Tensor -->
			<div class="legend-item">
				<span
					class="legend-color"
					style="background: {NODE_COLORS.tensor.background}; border-color: {NODE_COLORS.tensor.border};"
				></span>
				<span>Tensor</span>
			</div>
			<!-- Module Group -->
			<div class="legend-item">
				<span class="legend-color group-icon"></span>
				<span>Group</span>
			</div>
		</div>
	</div>
</div>

<style>
	.graph-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.empty-state {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f9fafb;
		color: #6b7280;
	}

	/* Legend */
	.legend {
		position: absolute;
		top: 16px;
		left: 16px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 10px 14px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		z-index: 10;
		max-width: 120px;
	}

	.legend-title {
		font-size: 10px;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 8px;
	}

	.legend-items {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: #4b5563;
	}

	.legend-color {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1.5px solid;
		flex-shrink: 0;
	}

	.group-icon {
		background: rgba(220, 220, 220, 0.5) !important;
		border-style: dashed !important;
		border-color: rgb(160, 160, 160) !important;
	}

	/* Svelte Flow overrides */
	:global(.svelte-flow) {
		background: #ffffff;
	}

	/* 
	 * Z-index layering for proper rendering order:
	 * 1. Group nodes (lowest) - z-index: -10 (set in layout.ts)
	 * 2. Edges (middle) - z-index: 5 
	 * 3. Regular nodes (highest) - z-index: 10 (set in layout.ts)
	 */
	:global(.svelte-flow__edges) {
		z-index: 5 !important;
	}

	/* Group nodes should be below edges */
	:global(.svelte-flow__node-group) {
		z-index: -10 !important;
	}

	/* Edge styling */
	:global(.svelte-flow__edge-path) {
		stroke: #9ca3af;
		stroke-width: 1.5px;
		fill: none;
	}

	:global(.svelte-flow__edge.animated .svelte-flow__edge-path) {
		stroke: #f97316;
		stroke-width: 2px;
		stroke-dasharray: 8 4;
		animation: flow-dash 1s linear infinite;
	}

	@keyframes flow-dash {
		to {
			stroke-dashoffset: -12;
		}
	}

	:global(.svelte-flow__controls) {
		position: absolute !important;
		bottom: 24px !important;
		right: 24px !important;
		left: unset !important;
		top: unset !important;
		width: auto !important;
		border: none !important;
		box-shadow: none !important;
		background: transparent !important;
	}

	:global(.svelte-flow__controls-button) {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: white;
		border: 1px solid #e5e7eb;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}

	:global(.svelte-flow__controls-button:hover) {
		background: #f9fafb;
	}
</style>

<script lang="ts" module>
	import type { Node } from '@xyflow/svelte';

	export type FunctionNodeData = {
		label: string;
		inputShape?: unknown[];
		outputShape?: unknown[];
		typeName?: string;
		depth: number;
		// Custom data for visualizations
		activationData?: number[][];
	};

	export type FunctionNodeType = Node<FunctionNodeData, 'function'>;
</script>

<script lang="ts">
	import { type NodeProps } from '@xyflow/svelte';
	import { getLayerTypeColor } from '$lib/types';
	import BaseNode from './BaseNode.svelte';

	type Props = NodeProps<FunctionNodeType>;
	let { id, data, selected }: Props = $props();

	const formatShape = (shape: unknown): string => {
		if (!shape) return '';
		if (typeof shape === 'string') return shape;
		if (Array.isArray(shape)) {
			if (shape.length === 0) return '';
			if (Array.isArray(shape[0])) return formatShape(shape[0]);
			return `(${shape.join(', ')})`;
		}
		return String(shape);
	};

	// Get the layer type from typeName or extract from label
	const getLayerType = (): string => {
		if (data.typeName) return data.typeName;
		// Try to extract from label (e.g., "relu_1" -> "relu")
		const match = data.label.match(/^([a-zA-Z_]+)/);
		return match ? match[1] : '';
	};

	const layerType = $derived(getLayerType());
	const colorConfig = $derived(getLayerTypeColor(layerType));
	const inputShapeStr = $derived(formatShape(data.inputShape));
	const outputShapeStr = $derived(formatShape(data.outputShape));
</script>

<BaseNode
	{id}
	{data}
	{selected}
	{colorConfig}
	label={data.label}
	{layerType}
	inputShape={inputShapeStr}
	outputShape={outputShapeStr}
	nodeId={id}
	depth={data.depth}
>
	<!-- Slot for custom content -->
	{#if data.activationData}
		<div class="function-visualization">
			<div class="placeholder">
				<span>Function Output</span>
			</div>
		</div>
	{/if}
</BaseNode>

<style>
	.function-visualization {
		width: 100%;
		height: 60px;
		border-radius: 4px;
		overflow: hidden;
	}

	.placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		color: #1e40af;
	}
</style>

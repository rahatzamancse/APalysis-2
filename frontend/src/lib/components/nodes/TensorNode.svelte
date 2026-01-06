<script lang="ts" module>
	import type { Node } from '@xyflow/svelte';

	export type TensorNodeData = {
		label: string;
		tensorShape?: string | number[];
		isInput?: boolean;
		isOutput?: boolean;
		depth: number;
		// Custom data for visualizations
		activationData?: number[][];
	};

	export type TensorNodeType = Node<TensorNodeData, 'tensor'>;
</script>

<script lang="ts">
	import { type NodeProps } from '@xyflow/svelte';
	import { NODE_COLORS } from '$lib/types';
	import BaseNode from './BaseNode.svelte';

	type Props = NodeProps<TensorNodeType>;
	let { id, data, selected }: Props = $props();

	const formatShape = (shape: string | number[] | undefined): string => {
		if (!shape) return '';
		if (typeof shape === 'string') return shape;
		if (Array.isArray(shape)) return `(${shape.join(', ')})`;
		return String(shape);
	};
</script>

<BaseNode
	{id}
	{data}
	{selected}
	colorConfig={NODE_COLORS.tensor}
	label={data.label}
	sublabel={formatShape(data.tensorShape)}
	nodeType="tensor"
	isInput={data.isInput}
	isOutput={data.isOutput}
	depth={data.depth}
>
	<!-- Slot for custom content like scatterplots -->
	{#if data.activationData}
		<div class="tensor-visualization">
			<!-- Placeholder for activation visualization -->
			<div class="placeholder">
				<span>Activation Data</span>
			</div>
		</div>
	{/if}
</BaseNode>

<style>
	.tensor-visualization {
		width: 100%;
		height: 60px;
		border-radius: 4px;
		overflow: hidden;
	}

	.placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		color: #92400e;
	}
</style>

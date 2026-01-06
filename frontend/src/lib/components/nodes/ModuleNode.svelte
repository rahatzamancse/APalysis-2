<script lang="ts" module>
	import type { Node } from '@xyflow/svelte';

	export type ModuleNodeData = {
		label: string;
		inputShape?: unknown[];
		outputShape?: unknown[];
		typeName?: string;
		isContainer?: boolean;
		isActivation?: boolean;
		depth: number;
		// Custom data for visualizations
		activationData?: number[][];
		weights?: number[][];
	};

	export type ModuleNodeType = Node<ModuleNodeData, 'module'>;
</script>

<script lang="ts">
	import { type NodeProps } from '@xyflow/svelte';
	import { NODE_COLORS } from '$lib/types';
	import BaseNode from './BaseNode.svelte';

	type Props = NodeProps<ModuleNodeType>;
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

	const getSublabel = (): string => {
		const inShape = formatShape(data.inputShape);
		const outShape = formatShape(data.outputShape);
		if (inShape && outShape) return `${inShape} → ${outShape}`;
		return outShape || inShape || '';
	};
</script>

<BaseNode
	{id}
	{data}
	{selected}
	colorConfig={NODE_COLORS.module}
	label={data.label}
	sublabel={getSublabel()}
	nodeType="module"
	depth={data.depth}
>
	<!-- Slot for custom content like weight visualizations -->
	{#if data.activationData || data.weights}
		<div class="module-visualization">
			<div class="placeholder">
				<span>{data.weights ? 'Weights' : 'Activations'}</span>
			</div>
		</div>
	{/if}
</BaseNode>

<style>
	.module-visualization {
		width: 100%;
		height: 60px;
		border-radius: 4px;
		overflow: hidden;
	}

	.placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		color: #065f46;
	}
</style>

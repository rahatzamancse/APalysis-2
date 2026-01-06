<script lang="ts" module>
	import type { Node } from '@xyflow/svelte';

	export type GroupNodeData = {
		label: string;
		depth: number;
	};

	export type GroupNodeType = Node<GroupNodeData, 'group'>;
</script>

<script lang="ts">
	import { type NodeProps, NodeResizer } from '@xyflow/svelte';

	type Props = NodeProps<GroupNodeType>;
	let { data, width = 200, height = 100 }: Props = $props();

	// Colors for different nesting levels
	const subgraphColors = [
		{ fill: 'rgba(240, 249, 255, 0.8)', stroke: '#93c5fd' }, // Level 1
		{ fill: 'rgba(250, 245, 255, 0.8)', stroke: '#c4b5fd' }, // Level 2
		{ fill: 'rgba(254, 252, 232, 0.8)', stroke: '#fcd34d' }, // Level 3
		{ fill: 'rgba(240, 253, 244, 0.8)', stroke: '#86efac' }, // Level 4
		{ fill: 'rgba(255, 241, 242, 0.8)', stroke: '#fda4af' }, // Level 5
		{ fill: 'rgba(248, 250, 252, 0.8)', stroke: '#cbd5e1' }  // Level 6+
	];

	function getColor(depth: number) {
		const idx = Math.min((depth || 1) - 1, subgraphColors.length - 1);
		return subgraphColors[Math.max(0, idx)];
	}

	const colors = $derived(getColor(data?.depth ?? 1));
	const safeWidth = $derived(width ?? 200);
	const safeHeight = $derived(height ?? 100);
</script>

<div
	class="group-node"
	style="
		width: {safeWidth}px;
		height: {safeHeight}px;
		background: {colors.fill};
		border-color: {colors.stroke};
		--group-stroke: {colors.stroke};
	"
>
	<!-- Resize by dragging right or bottom edge -->
	<NodeResizer
		minWidth={100}
		minHeight={60}
		isVisible={true}
	/>
	
	<div class="group-label">
		{data.label}
	</div>
</div>

<style>
	.group-node {
		border: 1.5px dashed;
		border-radius: 12px;
		position: relative;
		/* Override Svelte Flow's default node wrapper border */
		box-shadow: none;
	}

	/* Remove the black border from the Svelte Flow node wrapper */
	:global(.svelte-flow__node-group) {
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
	}

	.group-label {
		position: absolute;
		top: 6px;
		left: 12px;
		background: rgba(255, 255, 255, 0.9);
		padding: 2px 10px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		color: #4b5563;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	}

	/* NodeResizer styling - show only right and bottom edges */
	
	/* Hide all corner handles */
	:global(.svelte-flow__node-group .svelte-flow__resize-control.top-left),
	:global(.svelte-flow__node-group .svelte-flow__resize-control.top-right),
	:global(.svelte-flow__node-group .svelte-flow__resize-control.bottom-left),
	:global(.svelte-flow__node-group .svelte-flow__resize-control.bottom-right) {
		display: none !important;
	}

	/* Hide top and left edge controls */
	:global(.svelte-flow__node-group .svelte-flow__resize-control.top),
	:global(.svelte-flow__node-group .svelte-flow__resize-control.left) {
		display: none !important;
	}

	/* Style right edge control */
	:global(.svelte-flow__node-group .svelte-flow__resize-control.right) {
		width: 8px !important;
		right: -4px !important;
		cursor: ew-resize !important;
		background: transparent !important;
		border: none !important;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	:global(.svelte-flow__node-group .svelte-flow__resize-control.right:hover),
	.group-node:hover :global(.svelte-flow__resize-control.right) {
		opacity: 1;
		background: rgba(147, 197, 253, 0.5) !important;
		border-radius: 4px;
	}

	/* Style bottom edge control */
	:global(.svelte-flow__node-group .svelte-flow__resize-control.bottom) {
		height: 8px !important;
		bottom: -4px !important;
		cursor: ns-resize !important;
		background: transparent !important;
		border: none !important;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	:global(.svelte-flow__node-group .svelte-flow__resize-control.bottom:hover),
	.group-node:hover :global(.svelte-flow__resize-control.bottom) {
		opacity: 1;
		background: rgba(147, 197, 253, 0.5) !important;
		border-radius: 4px;
	}
</style>

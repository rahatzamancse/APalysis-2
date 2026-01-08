<script lang="ts">
	import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/svelte';
	import type { NodeColorConfig } from '$lib/types';
	import type { Snippet } from 'svelte';

	interface Props extends NodeProps {
		colorConfig: NodeColorConfig;
		label: string;
		typeName: string;
		inputShape?: string;
		outputShape?: string;
		isInput?: boolean;
		isOutput?: boolean;
		depth?: number;
		children?: Snippet;
	}

	let {
		id,
		data,
		colorConfig,
		label,
		typeName,
		inputShape = '-',
		outputShape = '-',
		isInput = false,
		isOutput = false,
		depth = 0,
		selected = false,
		children
	}: Props = $props();

	const truncateLabel = (text: string, max: number) =>
		text.length > max ? text.slice(0, max - 2) + '...' : text;
</script>

<div
	class="base-node"
	class:selected
	style="
		--bg-color: {colorConfig.background};
		--border-color: {colorConfig.border};
		--text-color: {colorConfig.text};
		--header-bg: {colorConfig.headerBg};
	"
>
	<!-- Resize by dragging right or bottom edge -->
	<NodeResizer
		minWidth={180}
		minHeight={100}
		isVisible={true}
	/>

	<!-- Left handle (input/target) -->
	<Handle 
		type="target" 
		position={Position.Left} 
		id="target"
		style="width: 12px; height: 12px; background: white; border: 2px solid {colorConfig.border}; left: -6px;"
	/>

	<!-- Node content -->
	<div class="node-inner">
		<!-- Header: Layer Type -->
		<div class="node-header">
			<span class="node-type">{typeName}</span>
		</div>

		<!-- Body: Details -->
		<div class="node-details">
			<div class="detail-row">
				<span class="detail-label">ID:</span>
				<span class="detail-value mono">{truncateLabel(id, 15)}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">In:</span>
				<span class="detail-value mono">{truncateLabel(inputShape, 20)}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Out:</span>
				<span class="detail-value mono">{truncateLabel(outputShape, 20)}</span>
			</div>
		</div>

		<!-- Custom content slot -->
		{#if children}
			<div class="node-content">
				{@render children()}
			</div>
		{/if}

		<!-- Footer -->
		<div class="node-footer">
			<div class="node-badges">
				{#if isInput}
					<span class="badge badge-input">INPUT</span>
				{/if}
				{#if isOutput}
					<span class="badge badge-output">OUTPUT</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Left accent bar -->
	<div class="accent-bar"></div>

	<!-- Right handle (output/source) -->
	<Handle 
		type="source" 
		position={Position.Right} 
		id="source"
		style="width: 12px; height: 12px; background: white; border: 2px solid {colorConfig.border}; right: -6px;"
	/>
</div>

<style>
	.base-node {
		position: relative;
		min-width: 200px;
		background: var(--bg-color);
		border: 1.5px solid var(--border-color);
		border-radius: 10px;
		box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.04);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
	}

	.base-node.selected {
		border-color: #3b82f6;
		border-width: 2.5px;
		box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
	}

	.accent-bar {
		position: absolute;
		left: 0;
		top: 0;
		width: 4px;
		height: 100%;
		background: var(--border-color);
		border-radius: 8px 0 0 8px;
		opacity: 0.8;
	}

	.node-inner {
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.node-header {
		background: var(--header-bg);
		padding: 8px 12px 8px 16px;
		border-radius: 8px 8px 0 0;
		border-bottom: 1px solid rgba(0,0,0,0.05);
	}

	.node-type {
		font-weight: 700;
		font-size: 14px;
		color: var(--text-color);
	}

	.node-details {
		padding: 8px 12px 8px 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-row {
		display: flex;
		gap: 6px;
		align-items: baseline;
		font-size: 11px;
		line-height: 1.4;
	}

	.detail-label {
		color: #6b7280;
		font-weight: 500;
		min-width: 24px;
	}

	.detail-value {
		color: #374151;
		font-weight: 500;
	}

	.detail-value.mono {
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.node-content {
		padding: 0 12px 8px 16px;
	}

	.node-footer {
		padding: 0 12px 8px 16px;
		display: flex;
		justify-content: flex-end;
	}

	.node-badges {
		display: flex;
		gap: 4px;
	}

	.badge {
		font-size: 9px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 3px;
	}

	.badge-input {
		background: rgba(16, 185, 129, 0.15);
		color: #059669;
	}

	.badge-output {
		background: rgba(239, 68, 68, 0.15);
		color: #dc2626;
	}

	/* Handle styling */
	:global(.svelte-flow__handle) {
		border-radius: 50%;
		transition: box-shadow 0.15s ease;
		z-index: 10;
	}

	:global(.svelte-flow__handle:hover) {
		box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
	}

	/* Resize controls styling */
	:global(.svelte-flow__node-function .svelte-flow__resize-control.right) {
		width: 8px !important;
		right: -4px !important;
		cursor: ew-resize !important;
		background: transparent !important;
		border: none !important;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	:global(.svelte-flow__node-function .svelte-flow__resize-control.right:hover),
	.base-node:hover :global(.svelte-flow__resize-control.right) {
		opacity: 1;
		background: rgba(59, 130, 246, 0.3) !important;
		border-radius: 4px;
	}
	
	/* Hide other resize handles */
	:global(.svelte-flow__node-function .svelte-flow__resize-control.top),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.left),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.bottom),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.top-left),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.top-right),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.bottom-left),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.bottom-right) {
		display: none !important;
	}
</style>

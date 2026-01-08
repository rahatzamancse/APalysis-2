<script lang="ts">
	import { Handle, Position, NodeResizer } from '@xyflow/svelte';
	import type { NodeColorConfig } from '$lib/types';
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		data: Record<string, unknown>;
		colorConfig: NodeColorConfig;
		label: string;
		layerType?: string;
		inputShape?: string;
		outputShape?: string;
		nodeId?: string;
		isInput?: boolean;
		isOutput?: boolean;
		depth?: number;
		selected?: boolean;
		children?: Snippet;
	}

	let {
		id,
		data,
		colorConfig,
		label,
		layerType = '',
		inputShape = '',
		outputShape = '',
		nodeId = '',
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
		minWidth={150}
		minHeight={60}
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
		<!-- Header with label and layer type badge -->
		<div class="node-header">
			<span class="node-label">{truncateLabel(label, 24)}</span>
			{#if layerType}
				<span class="layer-type-badge">{layerType}</span>
			{/if}
		</div>

		<!-- Node details grid -->
		<div class="node-details">
			{#if inputShape}
				<div class="detail-row">
					<span class="detail-label">in</span>
					<span class="detail-value">{inputShape}</span>
				</div>
			{/if}
			{#if outputShape}
				<div class="detail-row">
					<span class="detail-label">out</span>
					<span class="detail-value">{outputShape}</span>
				</div>
			{/if}
			{#if nodeId}
				<div class="detail-row id-row">
					<span class="detail-label">id</span>
					<span class="detail-value id-value">{truncateLabel(nodeId, 20)}</span>
				</div>
			{/if}
		</div>

		<!-- Custom content slot (for scatterplots, etc.) -->
		{#if children}
			<div class="node-content">
				{@render children()}
			</div>
		{/if}

		<!-- Footer with badges -->
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
		min-width: 180px;
		min-height: 90px;
		background: var(--bg-color);
		border: 1.5px solid var(--border-color);
		border-radius: 10px;
		box-shadow: 2px 3px 6px rgba(0, 0, 0, 0.04);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		/* Don't use overflow:hidden - it clips the handles positioned outside the node */
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
		border-radius: 10px 0 0 10px;
		opacity: 0.8;
	}

	.node-inner {
		padding: 10px 12px 8px 16px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.node-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--header-bg);
		margin: -10px -12px 6px -16px;
		padding: 8px 12px 8px 16px;
		border-radius: 8px 8px 0 0;
		gap: 8px;
	}

	.node-label {
		font-weight: 600;
		font-size: 13px;
		color: #1f2937;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.layer-type-badge {
		font-size: 9px;
		font-weight: 600;
		color: var(--text-color);
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid var(--border-color);
		padding: 2px 8px;
		border-radius: 4px;
		letter-spacing: 0.02em;
		text-transform: lowercase;
		white-space: nowrap;
	}

	.node-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.detail-label {
		font-size: 10px;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		min-width: 24px;
	}

	.detail-value {
		font-size: 11px;
		font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
		color: #4b5563;
		background: rgba(0, 0, 0, 0.03);
		padding: 2px 6px;
		border-radius: 3px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.id-row {
		margin-top: 2px;
		padding-top: 4px;
		border-top: 1px solid rgba(0, 0, 0, 0.05);
	}

	.id-value {
		font-size: 9px;
		color: #9ca3af;
		background: transparent;
	}

	.node-content {
		margin: 8px 0;
		min-height: 40px;
	}

	.node-footer {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-top: auto;
		padding-top: 4px;
	}

	.node-badges {
		display: flex;
		gap: 4px;
	}

	.badge {
		font-size: 8px;
		font-weight: 600;
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

	/* Handle styling - no transform on hover to prevent movement */
	:global(.svelte-flow__handle) {
		border-radius: 50%;
		transition: box-shadow 0.15s ease;
	}

	:global(.svelte-flow__handle:hover) {
		box-shadow: 0 0 6px rgba(59, 130, 246, 0.5);
	}

	/* Make sure handles are visible above node content */
	:global(.svelte-flow__handle-left),
	:global(.svelte-flow__handle-right) {
		z-index: 10;
	}

	/* NodeResizer styling for child nodes - show only right edge for width resizing */
	/* Scoped to tensor, module, function nodes (not group nodes) */
	
	/* Hide all corner handles for non-group nodes */
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.top-left),
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.top-right),
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.bottom-left),
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.bottom-right),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.top-left),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.top-right),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.bottom-left),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.bottom-right),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.top-left),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.top-right),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.bottom-left),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.bottom-right) {
		display: none !important;
	}

	/* Hide top, left, and bottom edge controls for non-group nodes */
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.top),
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.left),
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.bottom),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.top),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.left),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.bottom),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.top),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.left),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.bottom) {
		display: none !important;
	}

	/* Style right edge control for width resizing */
	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.right),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.right),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.right) {
		width: 8px !important;
		right: -4px !important;
		cursor: ew-resize !important;
		background: transparent !important;
		border: none !important;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	:global(.svelte-flow__node-tensor .svelte-flow__resize-control.right:hover),
	:global(.svelte-flow__node-module .svelte-flow__resize-control.right:hover),
	:global(.svelte-flow__node-function .svelte-flow__resize-control.right:hover),
	.base-node:hover :global(.svelte-flow__resize-control.right) {
		opacity: 1;
		background: rgba(59, 130, 246, 0.3) !important;
		border-radius: 4px;
	}
</style>

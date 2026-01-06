<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { LayoutData, LayoutNode, LayoutEdge } from '$lib/types';
	import { generateEdgePath, formatShape } from '$lib/layout';
	import { NODE_COLORS, type NodeType } from '$lib/types';

	interface Props {
		layoutData: LayoutData;
		selectedNodeId: string | null;
		onNodeSelect: (nodeId: string) => void;
		onBackgroundClick: () => void;
	}

	let { layoutData, selectedNodeId, onNodeSelect, onBackgroundClick }: Props = $props();

	let containerElement: HTMLDivElement;

	// Transform state for zoom/pan
	let transform = $state({ x: 50, y: 50, k: 1 });

	// D3 zoom behavior (stored to reuse across functions)
	let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

	// Get color config for node type
	function getNodeColor(nodeType: NodeType) {
		return NODE_COLORS[nodeType] || NODE_COLORS.unknown;
	}

	// Sort subgraph boxes by depth (shallowest/parents first so they're drawn behind children)
	const sortedSubgraphBoxes = $derived(
		Object.entries(layoutData.subgraphBoxes).sort((a, b) => (a[1].depth || 0) - (b[1].depth || 0))
	);

	// Colors for different nesting levels
	const subgraphColors = [
		{ fill: '#f0f9ff', stroke: '#93c5fd' }, // Level 1 - lightest blue
		{ fill: '#faf5ff', stroke: '#c4b5fd' }, // Level 2 - light purple
		{ fill: '#fefce8', stroke: '#fcd34d' }, // Level 3 - light yellow
		{ fill: '#f0fdf4', stroke: '#86efac' }, // Level 4 - light green
		{ fill: '#fff1f2', stroke: '#fda4af' }, // Level 5 - light red
		{ fill: '#f8fafc', stroke: '#cbd5e1' }  // Level 6+ - light gray
	];

	function getSubgraphColor(depth: number) {
		const idx = Math.min(depth - 1, subgraphColors.length - 1);
		return subgraphColors[Math.max(0, idx)];
	}

	// Initialize D3 zoom behavior
	onMount(() => {
		if (!containerElement) return;

		const svg = d3.select(containerElement).select('svg');
		zoomBehavior = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 4])
			.on('zoom', (event) => {
				transform = {
					x: event.transform.x,
					y: event.transform.y,
					k: event.transform.k
				};
			});

		svg.call(zoomBehavior as any);

		// Fit to view after initial render
		setTimeout(() => fitToView(), 100);
	});

	// Refit when layout changes
	$effect(() => {
		if (layoutData.nodes.length > 0) {
			setTimeout(() => fitToView(), 50);
		}
	});

	function fitToView() {
		if (!containerElement || !zoomBehavior) return;

		const svg = d3.select(containerElement).select<SVGSVGElement>('svg');
		const containerRect = containerElement.getBoundingClientRect();
		const padding = 80;

		const graphWidth = layoutData.width + padding * 2;
		const graphHeight = layoutData.height + padding * 2;

		const scale = Math.min(
			containerRect.width / graphWidth,
			containerRect.height / graphHeight,
			1.0
		);

		const translateX = (containerRect.width - layoutData.width * scale) / 2;
		const translateY = (containerRect.height - layoutData.height * scale) / 2;

		svg.transition()
			.duration(500)
			.call(
				zoomBehavior.transform as any,
				d3.zoomIdentity.translate(translateX, translateY).scale(scale)
			);
	}

	function handleBackgroundClick(e: MouseEvent) {
		const target = e.target as SVGElement;
		if (target.classList.contains('graph-bg') || target.tagName === 'svg') {
			onBackgroundClick();
		}
	}

	function handleNodeClick(e: MouseEvent, node: LayoutNode) {
		e.stopPropagation();
		onNodeSelect(node.id);
	}

	function handleNodeRightClick(e: MouseEvent, node: LayoutNode) {
		e.preventDefault();
		e.stopPropagation();
		onNodeSelect(node.id);
	}

	// Format node label based on type
	function getNodeLabel(node: LayoutNode): string {
		return node.name;
	}

	// Format node sublabel based on type
	function getNodeSublabel(node: LayoutNode): string {
		if (node.nodeType === 'tensor') {
			return formatShape(node.tensorShape);
		}
		if (node.nodeType === 'module' || node.nodeType === 'function') {
			const inShape = formatShape(node.inputShape);
			const outShape = formatShape(node.outputShape);
			if (inShape && outShape) {
				return `${inShape} → ${outShape}`;
			}
			return outShape || inShape || '';
		}
		return '';
	}

	// Get edge label for count > 1
	function getEdgeLabel(edge: LayoutEdge): string {
		return edge.count > 1 ? `×${edge.count}` : '';
	}
</script>

<div class="graph-container" bind:this={containerElement}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<svg class="graph-svg" onclick={handleBackgroundClick}>
		<!-- Background -->
		<rect class="graph-bg" width="100%" height="100%" fill="#ffffff" />

		<!-- Subtle dot grid pattern -->
		<defs>
			<pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
				<circle cx="10" cy="10" r="1" fill="#e5e7eb" />
			</pattern>
			<!-- Arrow marker -->
			<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
				<polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
			</marker>
			<!-- Arrow marker for back edges (feedback loops) -->
			<marker id="arrowhead-back" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
				<polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
			</marker>
			<!-- Gradient for input nodes -->
			<linearGradient id="input-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#10B981;stop-opacity:0.15" />
				<stop offset="100%" style="stop-color:#10B981;stop-opacity:0" />
			</linearGradient>
			<!-- Gradient for output nodes -->
			<linearGradient id="output-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#EF4444;stop-opacity:0" />
				<stop offset="100%" style="stop-color:#EF4444;stop-opacity:0.15" />
			</linearGradient>
		</defs>
		<rect width="100%" height="100%" fill="url(#dot-grid)" />

		<!-- Main transform group -->
		<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
			<!-- Subgraph boxes (module groups) - rendered first as backgrounds, parents before children -->
			{#each sortedSubgraphBoxes as [sgId, box] (sgId)}
				{@const colors = getSubgraphColor(box.depth)}
				<g class="subgraph-box">
					<!-- Background fill with depth-based coloring -->
					<rect
						x={box.x}
						y={box.y}
						width={box.width}
						height={box.height}
						rx="12"
						fill={colors.fill}
						stroke={colors.stroke}
						stroke-width="1.5"
						stroke-dasharray="6 3"
						opacity="0.9"
					/>
					<!-- Label background for readability -->
					<rect
						x={box.x + 8}
						y={box.y + 5}
						width={Math.min(box.label.length * 7 + 16, box.width - 16)}
						height="20"
						rx="4"
						fill="white"
						opacity="0.85"
					/>
					<!-- Label -->
					<text
						x={box.x + 16}
						y={box.y + 19}
						class="subgraph-label"
						fill="#4b5563"
						font-size="11"
						font-weight="600"
					>
						{box.label}
					</text>
				</g>
			{/each}

			<!-- Edges -->
			{#each layoutData.edges as edge (`${edge.source}-${edge.target}`)}
				{@const path = generateEdgePath(edge)}
				{@const label = getEdgeLabel(edge)}
				{@const lastIdx = edge.points.length - 1}
				{@const midX = (edge.points[0].x + edge.points[lastIdx].x) / 2}
				{@const midY = (edge.points[0].y + edge.points[lastIdx].y) / 2}
				<g class="edge-group" class:back-edge={edge.isBackEdge}>
					<path
						class="edge-path"
						d={path}
						fill="none"
						stroke={edge.isBackEdge ? '#f97316' : '#d1d5db'}
						stroke-width={edge.isBackEdge ? 2.5 : 2}
						stroke-dasharray={edge.isBackEdge ? '8 4' : 'none'}
						marker-end={edge.isBackEdge ? 'url(#arrowhead-back)' : 'url(#arrowhead)'}
					/>
					{#if label}
						<text
							x={midX}
							y={edge.isBackEdge ? midY - 15 : midY - 8}
							class="edge-label"
							fill={edge.isBackEdge ? '#ea580c' : '#9ca3af'}
							font-size="11"
							font-weight={edge.isBackEdge ? '600' : '400'}
							text-anchor="middle"
						>
							{label}
						</text>
					{/if}
				</g>
			{/each}

			<!-- Nodes -->
			{#each layoutData.nodes as node (node.id)}
				{@const color = getNodeColor(node.nodeType)}
				{@const isSelected = selectedNodeId === node.id}
				{@const label = getNodeLabel(node)}
				{@const sublabel = getNodeSublabel(node)}
				{@const isInput = node.isInput}
				{@const isOutput = node.isOutput}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<g
					class="graph-node"
					class:selected={isSelected}
					transform="translate({node.x}, {node.y})"
					onclick={(e) => handleNodeClick(e, node)}
					oncontextmenu={(e) => handleNodeRightClick(e, node)}
				>
					<!-- Node shadow -->
					<rect
						width={node.width}
						height={node.height}
						rx="10"
						fill="rgba(0,0,0,0.04)"
						transform="translate(2, 3)"
					/>
					<!-- Node background -->
					<rect
						class="node-bg"
						width={node.width}
						height={node.height}
						rx="10"
						fill={color.background}
						stroke={isSelected ? '#3b82f6' : color.border}
						stroke-width={isSelected ? 2.5 : 1.5}
					/>
					<!-- Input indicator gradient -->
					{#if isInput}
						<rect
							width={node.width}
							height={node.height}
							rx="10"
							fill="url(#input-gradient)"
							pointer-events="none"
						/>
					{/if}
					<!-- Output indicator gradient -->
					{#if isOutput}
						<rect
							width={node.width}
							height={node.height}
							rx="10"
							fill="url(#output-gradient)"
							pointer-events="none"
						/>
					{/if}
					<!-- Header bar -->
					<rect
						width={node.width}
						height="32"
						rx="10"
						fill={color.headerBg}
						clip-path="inset(0 0 50% 0 round 10px)"
					/>
					<rect y="10" width={node.width} height="22" fill={color.headerBg} />
					<!-- Left accent bar -->
					<rect width="4" height={node.height} rx="2" fill={color.border} opacity="0.8" />
					<!-- Type badge -->
					<g transform="translate({node.width - 60}, 8)">
						<rect
							width="52"
							height="18"
							rx="4"
							fill={color.border}
							opacity="0.15"
						/>
						<text
							x="26"
							y="13"
							class="type-badge"
							fill={color.text}
							font-size="9"
							font-weight="600"
							text-anchor="middle"
						>
							{node.nodeType.toUpperCase()}
						</text>
					</g>
					<!-- Label -->
					<text
						x="14"
						y="22"
						class="node-label"
						fill="#1f2937"
						font-weight="600"
						font-size="13"
					>
						{label.length > 20 ? label.slice(0, 18) + '...' : label}
					</text>
					<!-- Sublabel (shape info) -->
					{#if sublabel}
						<text
							x="14"
							y={node.nodeType === 'tensor' ? 45 : 48}
							class="node-sublabel"
							fill="#6b7280"
							font-size="11"
						>
							{sublabel.length > 28 ? sublabel.slice(0, 26) + '...' : sublabel}
						</text>
					{/if}
					<!-- Depth indicator -->
					<text
						x="14"
						y={node.height - 10}
						class="node-depth"
						fill="#9ca3af"
						font-size="9"
					>
						depth: {node.depth}
					</text>
					<!-- Input/Output badges -->
					{#if isInput}
						<g transform="translate(14, {node.height - 28})">
							<rect width="36" height="14" rx="3" fill="#10B981" opacity="0.15" />
							<text x="18" y="10" fill="#059669" font-size="8" font-weight="600" text-anchor="middle">
								INPUT
							</text>
						</g>
					{/if}
					{#if isOutput}
						<g transform="translate({node.width - 50}, {node.height - 28})">
							<rect width="42" height="14" rx="3" fill="#EF4444" opacity="0.15" />
							<text x="21" y="10" fill="#DC2626" font-size="8" font-weight="600" text-anchor="middle">
								OUTPUT
							</text>
						</g>
					{/if}
					<!-- Connection handles -->
					<circle
						cx="0"
						cy={node.height / 2}
						r="5"
						fill="white"
						stroke={color.border}
						stroke-width="2"
					/>
					<circle
						cx={node.width}
						cy={node.height / 2}
						r="5"
						fill="white"
						stroke={color.border}
						stroke-width="2"
					/>
				</g>
			{/each}
		</g>
	</svg>

	<!-- Legend -->
	<div class="legend">
		<div class="legend-title">Legend</div>
		<div class="legend-items">
			<div class="legend-item">
				<span class="legend-color" style="background: {NODE_COLORS.tensor.background}; border-color: {NODE_COLORS.tensor.border};"></span>
				<span>Tensor</span>
			</div>
			<div class="legend-item">
				<span class="legend-color" style="background: {NODE_COLORS.module.background}; border-color: {NODE_COLORS.module.border};"></span>
				<span>Module</span>
			</div>
			<div class="legend-item">
				<span class="legend-color" style="background: {NODE_COLORS.function.background}; border-color: {NODE_COLORS.function.border};"></span>
				<span>Function</span>
			</div>
			<div class="legend-item">
				<span class="legend-color subgraph-icon"></span>
				<span>Module Group</span>
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="graph-controls">
		<button class="control-btn" onclick={fitToView} title="Fit to view">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
			</svg>
		</button>
		<button
			class="control-btn"
			onclick={() => {
				if (!zoomBehavior) return;
				const svg = d3.select(containerElement).select<SVGSVGElement>('svg');
				svg.transition().duration(200).call(zoomBehavior.scaleBy as any, 1.3);
			}}
			title="Zoom in"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
			</svg>
		</button>
		<button
			class="control-btn"
			onclick={() => {
				if (!zoomBehavior) return;
				const svg = d3.select(containerElement).select<SVGSVGElement>('svg');
				svg.transition().duration(200).call(zoomBehavior.scaleBy as any, 0.7);
			}}
			title="Zoom out"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<path d="M21 21l-4.35-4.35M8 11h6" />
			</svg>
		</button>
	</div>
</div>

<style>
	.graph-container {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
		background: #ffffff;
	}

	.graph-svg {
		width: 100%;
		height: 100%;
		cursor: grab;
	}

	.graph-svg:active {
		cursor: grabbing;
	}

	.graph-node {
		cursor: pointer;
		transition: filter 0.15s ease;
	}

	.graph-node:hover .node-bg {
		filter: brightness(0.97);
	}

	.graph-node.selected .node-bg {
		filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
	}

	.edge-path {
		pointer-events: none;
		transition: stroke 0.15s ease;
	}

	.subgraph-box {
		pointer-events: none;
	}

	.node-label,
	.node-sublabel,
	.node-depth,
	.type-badge,
	.subgraph-label,
	.edge-label {
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
		pointer-events: none;
	}

	.type-badge {
		letter-spacing: 0.03em;
	}

	/* Legend */
	.legend {
		position: absolute;
		top: 16px;
		left: 16px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 10px;
		padding: 12px 16px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}

	.legend-title {
		font-size: 11px;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 10px;
	}

	.legend-items {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: #4b5563;
	}

	.legend-color {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 2px solid;
	}

	.subgraph-icon {
		background: transparent !important;
		border-style: dashed !important;
		border-color: #9ca3af !important;
	}

	/* Controls */
	.graph-controls {
		position: absolute;
		bottom: 24px;
		right: 24px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.control-btn {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: white;
		border: 1px solid #e5e7eb;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6b7280;
		transition: all 0.15s ease;
	}

	.control-btn:hover {
		background: #f9fafb;
		border-color: #d1d5db;
		color: #374151;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.control-btn svg {
		width: 18px;
		height: 18px;
	}
</style>

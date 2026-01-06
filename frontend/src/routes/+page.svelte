<script lang="ts">
	import { onMount } from 'svelte';
	import Graph from '$lib/components/Graph.svelte';
	import { getGraph, getModelSummary } from '$lib/api';
	import { computeLayout, type LayoutData } from '$lib/layout';
	import type { TorchviewGraphData, TorchviewNode, ModelSummary } from '$lib/types';

	// State
	let graphData = $state<TorchviewGraphData | null>(null);
	let layoutData = $state<LayoutData | null>(null);
	let selectedNodeId = $state<string | null>(null);
	let selectedNode = $state<TorchviewNode | null>(null);
	let modelSummary = $state<ModelSummary | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isDetailsPanelOpen = $state(false);

	// Stats derived from graph data
	const graphStats = $derived(() => {
		if (!graphData) return null;
		const tensorCount = graphData.nodes.filter((n: TorchviewNode) => n.nodeType === 'tensor').length;
		const moduleCount = graphData.nodes.filter((n: TorchviewNode) => n.nodeType === 'module').length;
		const functionCount = graphData.nodes.filter((n: TorchviewNode) => n.nodeType === 'function').length;
		return {
			nodes: graphData.nodes.length,
			edges: graphData.edges.length,
			tensors: tensorCount,
			modules: moduleCount,
			functions: functionCount,
			subgraphs: Object.keys(graphData.subgraphs).length
		};
	});

	// Compute layout when graph data changes
	async function updateLayout(data: TorchviewGraphData) {
		try {
			layoutData = await computeLayout(data);
		} catch (e) {
			console.error('Layout computation failed:', e);
		}
	}

	// Fetch initial data
	onMount(async () => {
		try {
			// Load model summary
			modelSummary = await getModelSummary();

			// Load torchview graph
			const data = await getGraph();
			graphData = data;

			if (data.error) {
				error = `Graph generation error: ${data.error}`;
			} else {
			await updateLayout(data);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load model';
		} finally {
			isLoading = false;
		}
	});

	// Handle node selection (show details)
	function handleNodeSelect(nodeId: string) {
		selectedNodeId = nodeId;
		isDetailsPanelOpen = true;

		// Find node in graph data
		if (graphData) {
			selectedNode = graphData.nodes.find((n: TorchviewNode) => n.id === nodeId) || null;
		}
	}

	// Handle background click
	function handleBackgroundClick() {
		selectedNodeId = null;
		isDetailsPanelOpen = false;
		selectedNode = null;
	}

	// Close details panel
	function closeDetailsPanel() {
		isDetailsPanelOpen = false;
	}

	// Format shape for display
	function formatShape(shape: unknown): string {
		if (!shape) return '-';
		if (typeof shape === 'string') return shape;
		if (Array.isArray(shape)) {
			if (shape.length === 0) return '-';
			return JSON.stringify(shape);
		}
		return String(shape);
	}
</script>

<svelte:head>
	<title>APalysis - TorchView Visualization</title>
	<meta name="description" content="Interactive PyTorch model visualization powered by torchview" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app-container">
	<!-- Header -->
	<header class="app-header">
		<div class="header-left">
			<div class="logo">
				<svg viewBox="0 0 32 32" fill="none">
					<rect width="32" height="32" rx="8" fill="#3b82f6" />
					<path
						d="M8 16h4l2-6 4 12 2-6h4"
						stroke="white"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>APalysis</span>
			</div>
			{#if modelSummary}
				<div class="model-info">
					<span class="model-name">{modelSummary.name}</span>
					<span class="model-class">{modelSummary.class}</span>
				</div>
			{/if}
		</div>

		<div class="header-right">
			{#if modelSummary}
				<div class="stats">
					<div class="stat">
						<span class="stat-value"
							>{(modelSummary.total_parameters / 1_000_000).toFixed(2)}M</span
						>
						<span class="stat-label">Parameters</span>
					</div>
					<div class="stat">
						<span class="stat-value">{modelSummary.total_layers}</span>
						<span class="stat-label">Layers</span>
					</div>
					{#if graphStats()}
						<div class="stat">
							<span class="stat-value">{graphStats()?.nodes}</span>
							<span class="stat-label">Nodes</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="app-main">
		{#if isLoading && !layoutData}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Generating computation graph...</p>
			</div>
		{:else if error}
			<div class="error-state">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 8v4M12 16h.01" />
				</svg>
				<h2>Error</h2>
				<p>{error}</p>
				<button onclick={() => window.location.reload()}>Reload</button>
			</div>
		{:else if layoutData}
			<Graph
				{layoutData}
				{selectedNodeId}
				onNodeSelect={handleNodeSelect}
				onBackgroundClick={handleBackgroundClick}
			/>

			<!-- Loading overlay -->
			{#if isLoading}
				<div class="loading-overlay">
					<div class="spinner small"></div>
					<span>Updating...</span>
				</div>
			{/if}
		{/if}
	</main>

	<!-- Details panel -->
	<aside class="details-panel" class:open={isDetailsPanelOpen}>
		<div class="panel-header">
			<h3>Node Details</h3>
		<button class="close-btn" onclick={closeDetailsPanel} title="Close details panel">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
		</div>

		{#if selectedNode}
			<div class="panel-content">
				<div class="detail-section">
					<h4>General</h4>
					<div class="detail-row">
						<span class="detail-label">Name</span>
						<span class="detail-value">{selectedNode.name}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Type</span>
						<span class="detail-value type-badge" data-type={selectedNode.nodeType}>
							{selectedNode.nodeType}
						</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Depth</span>
						<span class="detail-value">{selectedNode.depth}</span>
					</div>
					{#if selectedNode.subgraphLabel}
						<div class="detail-row">
							<span class="detail-label">Module Group</span>
							<span class="detail-value">{selectedNode.subgraphLabel}</span>
						</div>
					{/if}
				</div>

				{#if selectedNode.nodeType === 'tensor'}
					<div class="detail-section">
						<h4>Tensor Info</h4>
						<div class="detail-row">
							<span class="detail-label">Shape</span>
							<span class="detail-value mono">{formatShape(selectedNode.tensorShape)}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Is Input</span>
							<span class="detail-value">{selectedNode.isInput ? 'Yes' : 'No'}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Is Output</span>
							<span class="detail-value">{selectedNode.isOutput ? 'Yes' : 'No'}</span>
						</div>
					</div>
				{/if}

				{#if selectedNode.nodeType === 'module' || selectedNode.nodeType === 'function'}
					<div class="detail-section">
						<h4>Shape Info</h4>
						<div class="detail-row">
							<span class="detail-label">Input</span>
							<span class="detail-value mono">{formatShape(selectedNode.inputShape)}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Output</span>
							<span class="detail-value mono">{formatShape(selectedNode.outputShape)}</span>
						</div>
						{#if selectedNode.typeName}
							<div class="detail-row">
								<span class="detail-label">Module Type</span>
								<span class="detail-value">{selectedNode.typeName}</span>
							</div>
						{/if}
						{#if selectedNode.isContainer !== undefined}
							<div class="detail-row">
								<span class="detail-label">Is Container</span>
								<span class="detail-value">{selectedNode.isContainer ? 'Yes' : 'No'}</span>
							</div>
						{/if}
					</div>
				{/if}

				<div class="detail-section">
					<h4>Raw ID</h4>
					<code class="raw-id">{selectedNode.id}</code>
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<p>Click on a node to view details</p>
			</div>
		{/if}
	</aside>

	<!-- Help tooltip -->
	<div class="help-tooltip">
		<button class="help-btn">?</button>
		<div class="help-content">
			<h4>How to use</h4>
			<ul>
				<li><strong>Click</strong> a node to view details</li>
				<li><strong>Scroll</strong> to zoom</li>
				<li><strong>Drag</strong> to pan</li>
			</ul>
			<div class="help-stats">
				{#if graphStats()}
					<p>
						<strong>{graphStats()?.tensors}</strong> tensors ·
						<strong>{graphStats()?.modules}</strong> modules ·
						<strong>{graphStats()?.functions}</strong> functions
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		background: #ffffff;
	}

	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.app-header {
		height: 60px;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 24px;
		flex-shrink: 0;
		z-index: 50;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 18px;
		font-weight: 700;
		color: #1f2937;
	}

	.logo svg {
		width: 32px;
		height: 32px;
	}

	.model-info {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding-left: 24px;
		border-left: 1px solid #e5e7eb;
	}

	.model-name {
		font-size: 15px;
		font-weight: 600;
		color: #374151;
	}

	.model-class {
		font-size: 12px;
		color: #6b7280;
		background: #f3f4f6;
		padding: 3px 10px;
		border-radius: 4px;
	}

	.header-right {
		display: flex;
		align-items: center;
	}

	.stats {
		display: flex;
		gap: 28px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.stat-value {
		font-size: 16px;
		font-weight: 700;
		color: #1f2937;
	}

	.stat-label {
		font-size: 10px;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.app-main {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.loading-state,
	.error-state {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #ffffff;
	}

	.loading-state p {
		margin-top: 16px;
		color: #6b7280;
		font-size: 14px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #e5e7eb;
		border-top-color: #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.spinner.small {
		width: 20px;
		height: 20px;
		border-width: 2px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-overlay {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		background: white;
		padding: 10px 20px;
		border-radius: 20px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		color: #4b5563;
	}

	.error-state {
		color: #6b7280;
	}

	.error-state svg {
		width: 48px;
		height: 48px;
		color: #f59e0b;
	}

	.error-state h2 {
		margin: 16px 0 8px;
		font-size: 18px;
		color: #374151;
	}

	.error-state p {
		margin: 0 0 16px;
	}

	.error-state button {
		padding: 10px 24px;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.error-state button:hover {
		background: #2563eb;
	}

	/* Details Panel */
	.details-panel {
		position: fixed;
		top: 60px;
		right: 0;
		bottom: 0;
		width: 340px;
		background: white;
		border-left: 1px solid #e5e7eb;
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.06);
		transform: translateX(100%);
		transition: transform 0.3s ease;
		z-index: 100;
		display: flex;
		flex-direction: column;
	}

	.details-panel.open {
		transform: translateX(0);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid #e5e7eb;
	}

	.panel-header h3 {
		font-size: 14px;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}

	.close-btn {
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: #f3f4f6;
		color: #4b5563;
	}

	.close-btn svg {
		width: 16px;
		height: 16px;
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px 20px;
	}

	.detail-section {
		margin-bottom: 20px;
	}

	.detail-section h4 {
		font-size: 11px;
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 12px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 8px 0;
		border-bottom: 1px solid #f3f4f6;
	}

	.detail-row:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-size: 12px;
		color: #6b7280;
	}

	.detail-value {
		font-size: 12px;
		color: #1f2937;
		font-weight: 500;
		text-align: right;
		max-width: 180px;
		word-break: break-all;
	}

	.detail-value.mono {
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 11px;
	}

	.type-badge {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.type-badge[data-type='tensor'] {
		background: #fef3c7;
		color: #92400e;
	}

	.type-badge[data-type='module'] {
		background: #d1fae5;
		color: #065f46;
	}

	.type-badge[data-type='function'] {
		background: #dbeafe;
		color: #1e40af;
	}

	.raw-id {
		display: block;
		padding: 10px 12px;
		background: #f9fafb;
		border-radius: 6px;
		font-size: 11px;
		color: #6b7280;
		word-break: break-all;
		font-family: 'SF Mono', 'Fira Code', monospace;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #9ca3af;
		font-size: 13px;
	}

	/* Help tooltip */
	.help-tooltip {
		position: fixed;
		bottom: 20px;
		left: 20px;
		z-index: 100;
	}

	.help-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: white;
		border: 1px solid #e5e7eb;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
		font-size: 14px;
		font-weight: 600;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.help-btn:hover {
		background: #f9fafb;
		color: #4b5563;
	}

	.help-content {
		position: absolute;
		bottom: 44px;
		left: 0;
		background: white;
		border-radius: 10px;
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		padding: 14px 18px;
		width: 220px;
		opacity: 0;
		visibility: hidden;
		transform: translateY(8px);
		transition: all 0.2s ease;
	}

	.help-tooltip:hover .help-content {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
	}

	.help-content h4 {
		margin: 0 0 10px;
		font-size: 12px;
		font-weight: 600;
		color: #374151;
	}

	.help-content ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.help-content li {
		font-size: 11px;
		color: #6b7280;
		padding: 3px 0;
	}

	.help-content li strong {
		color: #4b5563;
	}

	.help-stats {
		margin-top: 12px;
		padding-top: 10px;
		border-top: 1px solid #e5e7eb;
	}

	.help-stats p {
		margin: 0;
		font-size: 10px;
		color: #9ca3af;
	}

	.help-stats strong {
		color: #6b7280;
	}
</style>

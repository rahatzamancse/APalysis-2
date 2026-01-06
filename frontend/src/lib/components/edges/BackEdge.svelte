<script lang="ts">
	import { BaseEdge, type EdgeProps } from '@xyflow/svelte';

	type Props = EdgeProps;

	let {
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		markerEnd,
		style
	}: Props = $props();

	// Calculate a custom curved path for back edges that:
	// 1. Exits the source handle (right side) going RIGHT
	// 2. Curves upward
	// 3. Goes across to the left
	// 4. Curves down and enters target handle (left side) coming from LEFT
	const edgePath = $derived.by(() => {
		const horizontalDistance = Math.abs(targetX - sourceX);
		
		// How far to extend out from source (to the right)
		const sourceExtension = Math.max(40, Math.min(horizontalDistance * 0.15, 80));
		// How far to extend out from target (to the left)  
		const targetExtension = Math.max(40, Math.min(horizontalDistance * 0.15, 80));
		
		// Vertical offset for the arc - goes above both nodes
		const arcHeight = Math.max(60, Math.min(horizontalDistance * 0.25, 120));
		const topY = Math.min(sourceY, targetY) - arcHeight;
		
		// Key corner points
		const topRightX = sourceX + sourceExtension;
		const topLeftX = targetX - targetExtension;
		
		// Radius for rounded corners
		const cornerRadius = Math.min(25, arcHeight * 0.4, sourceExtension * 0.8);
		
		// Build path:
		// 1. Start at source
		// 2. Go right horizontally
		// 3. Round corner up
		// 4. Go up to top
		// 5. Round corner left
		// 6. Go left across top
		// 7. Round corner down
		// 8. Go down
		// 9. Round corner right (into target)
		// 10. Go right into target
		
		return `M ${sourceX} ${sourceY}
			L ${topRightX - cornerRadius} ${sourceY}
			Q ${topRightX} ${sourceY}, ${topRightX} ${sourceY - cornerRadius}
			L ${topRightX} ${topY + cornerRadius}
			Q ${topRightX} ${topY}, ${topRightX - cornerRadius} ${topY}
			L ${topLeftX + cornerRadius} ${topY}
			Q ${topLeftX} ${topY}, ${topLeftX} ${topY + cornerRadius}
			L ${topLeftX} ${targetY - cornerRadius}
			Q ${topLeftX} ${targetY}, ${topLeftX + cornerRadius} ${targetY}
			L ${targetX} ${targetY}`;
	});
</script>

<BaseEdge {id} path={edgePath} {markerEnd} {style} />

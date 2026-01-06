"""Hierarchical graph structure for model visualization."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from apalysis.parser import ModelParser


@dataclass
class GraphNode:
    """A node in the visualization graph."""

    id: str
    label: str
    layer_type: str
    module_class: str
    num_parameters: int
    params: dict[str, Any]
    has_children: bool
    expanded: bool
    depth: int
    parent_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "label": self.label,
            "layerType": self.layer_type,
            "moduleClass": self.module_class,
            "numParameters": self.num_parameters,
            "params": self.params,
            "hasChildren": self.has_children,
            "expanded": self.expanded,
            "depth": self.depth,
            "parentId": self.parent_id,
        }


@dataclass
class GraphEdge:
    """An edge in the visualization graph."""

    source: str
    target: str
    edge_type: str = "data"

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "source": self.source,
            "target": self.target,
            "edgeType": self.edge_type,
        }


@dataclass
class GraphData:
    """The complete graph data for visualization."""

    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
        }


class GraphBuilder:
    """
    Build and manage the visualization graph with expand/collapse state.

    This class maintains the expansion state of nodes and computes
    the visible graph based on which nodes are expanded.
    """

    def __init__(self, parser: ModelParser):
        self.parser = parser
        self._expanded_nodes: set[str] = set()

    def get_initial_graph(self) -> GraphData:
        """Get the initial graph with only the root node."""
        root_layer = self.parser.layers.get(self.parser.root_id)
        if root_layer is None:
            return GraphData()

        root_node = GraphNode(
            id=root_layer.id,
            label=root_layer.label,
            layer_type=root_layer.layer_type,
            module_class=root_layer.module_class,
            num_parameters=root_layer.num_parameters,
            params=root_layer.params,
            has_children=len(root_layer.children) > 0,
            expanded=False,
            depth=root_layer.depth,
            parent_id=None,
        )

        return GraphData(nodes=[root_node], edges=[])

    def get_full_graph(self) -> GraphData:
        """Get the full graph based on current expansion state."""
        visible_nodes: list[GraphNode] = []
        visible_edges: list[GraphEdge] = []

        # Start from root and collect visible nodes
        self._collect_visible_nodes(
            self.parser.root_id, visible_nodes, visible_edges
        )

        return GraphData(nodes=visible_nodes, edges=visible_edges)

    def _collect_visible_nodes(
        self,
        layer_id: str,
        visible_nodes: list[GraphNode],
        visible_edges: list[GraphEdge],
    ) -> None:
        """Recursively collect visible nodes based on expansion state."""
        layer = self.parser.layers.get(layer_id)
        if layer is None:
            return

        is_expanded = layer_id in self._expanded_nodes

        # Add this node
        node = GraphNode(
            id=layer.id,
            label=layer.label,
            layer_type=layer.layer_type,
            module_class=layer.module_class,
            num_parameters=layer.num_parameters,
            params=layer.params,
            has_children=len(layer.children) > 0,
            expanded=is_expanded,
            depth=layer.depth,
            parent_id=layer.parent_id,
        )
        visible_nodes.append(node)

        # If expanded, add children and edges
        if is_expanded and layer.children:
            prev_child_id: str | None = None

            for child_id in layer.children:
                # Add edge from parent to first child (hierarchy edge)
                visible_edges.append(
                    GraphEdge(
                        source=layer_id,
                        target=child_id,
                        edge_type="hierarchy",
                    )
                )

                # Add sequential edge between siblings
                if prev_child_id is not None:
                    visible_edges.append(
                        GraphEdge(
                            source=prev_child_id,
                            target=child_id,
                            edge_type="sequence",
                        )
                    )

                # Recursively process children
                self._collect_visible_nodes(
                    child_id, visible_nodes, visible_edges
                )

                prev_child_id = child_id

    def expand_node(self, node_id: str) -> GraphData:
        """Expand a node to show its children."""
        layer = self.parser.layers.get(node_id)
        if layer is None or not layer.children:
            return self.get_full_graph()

        self._expanded_nodes.add(node_id)
        return self.get_full_graph()

    def collapse_node(self, node_id: str) -> GraphData:
        """Collapse a node to hide its children."""
        if node_id in self._expanded_nodes:
            self._expanded_nodes.remove(node_id)

            # Also collapse all descendants
            self._collapse_descendants(node_id)

        return self.get_full_graph()

    def _collapse_descendants(self, node_id: str) -> None:
        """Recursively collapse all descendants of a node."""
        layer = self.parser.layers.get(node_id)
        if layer is None:
            return

        for child_id in layer.children:
            if child_id in self._expanded_nodes:
                self._expanded_nodes.remove(child_id)
            self._collapse_descendants(child_id)

    def toggle_node(self, node_id: str) -> GraphData:
        """Toggle the expansion state of a node."""
        if node_id in self._expanded_nodes:
            return self.collapse_node(node_id)
        else:
            return self.expand_node(node_id)

    def is_expanded(self, node_id: str) -> bool:
        """Check if a node is currently expanded."""
        return node_id in self._expanded_nodes

    def get_node_details(self, node_id: str) -> dict[str, Any] | None:
        """Get detailed information about a specific node."""
        layer = self.parser.layers.get(node_id)
        if layer is None:
            return None

        return {
            "id": layer.id,
            "name": layer.name,
            "label": layer.label,
            "layerType": layer.layer_type,
            "moduleClass": layer.module_class,
            "numParameters": layer.num_parameters,
            "params": layer.params,
            "hasChildren": len(layer.children) > 0,
            "childCount": len(layer.children),
            "children": layer.children,
            "parentId": layer.parent_id,
            "depth": layer.depth,
            "inputShape": layer.input_shape,
            "outputShape": layer.output_shape,
            "expanded": node_id in self._expanded_nodes,
        }

    def get_expansion_state(self) -> list[str]:
        """Get the list of currently expanded node IDs."""
        return list(self._expanded_nodes)

    def set_expansion_state(self, expanded_nodes: list[str]) -> None:
        """Set the expansion state from a list of node IDs."""
        self._expanded_nodes = set(expanded_nodes)

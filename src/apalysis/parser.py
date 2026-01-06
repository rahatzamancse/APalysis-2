"""Model parser using TorchView for extracting computation graphs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import torch
from torchview import draw_graph

if TYPE_CHECKING:
    import torch.nn as nn


@dataclass
class LayerInfo:
    """Information about a single layer in the model."""

    id: str
    name: str
    label: str
    layer_type: str
    module_class: str
    num_parameters: int
    params: dict[str, Any]
    children: list[str] = field(default_factory=list)
    parent_id: str | None = None
    depth: int = 0
    input_shape: list[tuple[int, ...]] | None = None
    output_shape: list[tuple[int, ...]] | None = None


class ModelParser:
    """
    Parse a PyTorch model into a hierarchical structure.

    Uses TorchView to extract the computation graph and builds a
    hierarchical tree based on module nesting.
    """

    def __init__(self, model: nn.Module, model_name: str = "model"):
        self.model = model
        self.model_name = model_name
        self.layers: dict[str, LayerInfo] = {}
        self.root_id: str = model_name
        self._computation_graph = None

    def parse(self) -> None:
        """Parse the model and build the hierarchical structure."""
        self._build_hierarchy_from_modules()
        self._extract_computation_graph()

    def _build_hierarchy_from_modules(self) -> None:
        """Build hierarchy from PyTorch module structure."""
        # Create root node for the model
        total_params = sum(p.numel() for p in self.model.parameters())

        self.layers[self.root_id] = LayerInfo(
            id=self.root_id,
            name=self.model_name,
            label=self.model_name,
            layer_type="Module",
            module_class=type(self.model).__name__,
            num_parameters=total_params,
            params={},
            children=[],
            parent_id=None,
            depth=0,
        )

        # Track parent-child relationships
        module_to_id: dict[int, str] = {id(self.model): self.root_id}

        # Iterate through all named modules
        for name, module in self.model.named_modules():
            if name == "":
                continue

            # Build the full path ID
            layer_id = f"{self.root_id}.{name}"

            # Find parent ID
            parts = name.split(".")
            if len(parts) == 1:
                parent_id = self.root_id
            else:
                parent_name = ".".join(parts[:-1])
                parent_id = f"{self.root_id}.{parent_name}"

            # Get module info
            num_params = sum(
                p.numel() for p in module.parameters(recurse=False)
            )
            layer_type = self._get_layer_type(module)
            module_class = type(module).__name__

            # Extract layer-specific parameters
            params = self._extract_layer_params(module)

            # Create layer info
            self.layers[layer_id] = LayerInfo(
                id=layer_id,
                name=parts[-1],
                label=parts[-1],
                layer_type=layer_type,
                module_class=module_class,
                num_parameters=num_params,
                params=params,
                children=[],
                parent_id=parent_id,
                depth=len(parts),
            )

            # Add to parent's children
            if parent_id in self.layers:
                self.layers[parent_id].children.append(layer_id)

            module_to_id[id(module)] = layer_id

    def _extract_computation_graph(self) -> None:
        """Extract computation graph using TorchView for shape information."""
        try:
            # Create sample input based on model type
            sample_input = self._create_sample_input()
            if sample_input is None:
                return

            # Use TorchView to get computation graph
            graph = draw_graph(
                self.model,
                input_data=sample_input,
                depth=100,  # Get full depth
                device="meta",  # Use meta device to avoid memory
                expand_nested=True,
                hide_inner_tensors=True,
                hide_module_functions=False,
                show_shapes=True,
            )

            self._computation_graph = graph

            # Extract shape information from the graph
            self._extract_shapes_from_graph(graph)

        except Exception:
            # If TorchView fails, we still have the module hierarchy
            pass

    def _create_sample_input(self) -> Any:
        """Create a sample input tensor for the model."""
        # Try to infer input shape from first layer
        for module in self.model.modules():
            if isinstance(module, torch.nn.Linear):
                in_features = module.in_features
                return torch.zeros(1, in_features, device="meta")
            elif isinstance(module, torch.nn.Conv2d):
                in_channels = module.in_channels
                return torch.zeros(1, in_channels, 224, 224, device="meta")
            elif isinstance(module, torch.nn.Conv1d):
                in_channels = module.in_channels
                return torch.zeros(1, in_channels, 128, device="meta")
            elif isinstance(module, torch.nn.Embedding):
                return torch.zeros(1, 32, dtype=torch.long, device="meta")

        # Default fallback
        return None

    def _extract_shapes_from_graph(self, graph: Any) -> None:
        """Extract input/output shapes from TorchView graph."""
        # TorchView provides shape information in its nodes
        # We map these back to our layer hierarchy
        try:
            for node in graph.node_set:
                if hasattr(node, "name") and hasattr(node, "output_shape"):
                    # Try to find matching layer
                    node_name = str(node.name)
                    for layer_id, layer in self.layers.items():
                        if layer.name in node_name or node_name in layer_id:
                            if hasattr(node, "input_shape"):
                                layer.input_shape = node.input_shape
                            if hasattr(node, "output_shape"):
                                layer.output_shape = node.output_shape
                            break
        except Exception:
            pass

    def _get_layer_type(self, module: nn.Module) -> str:
        """Determine the type category of a layer."""
        class_name = type(module).__name__

        # Map common layer types to categories
        type_map = {
            "Linear": "Linear",
            "Conv1d": "Conv",
            "Conv2d": "Conv",
            "Conv3d": "Conv",
            "ConvTranspose1d": "Conv",
            "ConvTranspose2d": "Conv",
            "ConvTranspose3d": "Conv",
            "BatchNorm1d": "Normalization",
            "BatchNorm2d": "Normalization",
            "BatchNorm3d": "Normalization",
            "LayerNorm": "Normalization",
            "GroupNorm": "Normalization",
            "InstanceNorm1d": "Normalization",
            "InstanceNorm2d": "Normalization",
            "Dropout": "Dropout",
            "Dropout2d": "Dropout",
            "Dropout3d": "Dropout",
            "ReLU": "Activation",
            "LeakyReLU": "Activation",
            "PReLU": "Activation",
            "ELU": "Activation",
            "SELU": "Activation",
            "GELU": "Activation",
            "Sigmoid": "Activation",
            "Tanh": "Activation",
            "Softmax": "Activation",
            "LogSoftmax": "Activation",
            "MaxPool1d": "Pooling",
            "MaxPool2d": "Pooling",
            "MaxPool3d": "Pooling",
            "AvgPool1d": "Pooling",
            "AvgPool2d": "Pooling",
            "AvgPool3d": "Pooling",
            "AdaptiveMaxPool1d": "Pooling",
            "AdaptiveMaxPool2d": "Pooling",
            "AdaptiveAvgPool1d": "Pooling",
            "AdaptiveAvgPool2d": "Pooling",
            "Flatten": "Reshape",
            "Unflatten": "Reshape",
            "LSTM": "Recurrent",
            "GRU": "Recurrent",
            "RNN": "Recurrent",
            "Embedding": "Embedding",
            "MultiheadAttention": "Attention",
            "Sequential": "Container",
            "ModuleList": "Container",
            "ModuleDict": "Container",
        }

        if class_name in type_map:
            return type_map[class_name]

        # Check for container types
        if hasattr(module, "children") and list(module.children()):
            return "Container"

        return "Module"

    def _extract_layer_params(self, module: nn.Module) -> dict[str, Any]:
        """Extract relevant parameters from a layer."""
        params: dict[str, Any] = {}
        class_name = type(module).__name__

        if isinstance(module, torch.nn.Linear):
            params["in_features"] = module.in_features
            params["out_features"] = module.out_features
            params["bias"] = module.bias is not None

        elif isinstance(module, (torch.nn.Conv1d, torch.nn.Conv2d, torch.nn.Conv3d)):
            params["in_channels"] = module.in_channels
            params["out_channels"] = module.out_channels
            params["kernel_size"] = module.kernel_size
            params["stride"] = module.stride
            params["padding"] = module.padding
            params["bias"] = module.bias is not None

        elif isinstance(
            module, (torch.nn.BatchNorm1d, torch.nn.BatchNorm2d, torch.nn.BatchNorm3d)
        ):
            params["num_features"] = module.num_features
            params["eps"] = module.eps
            params["momentum"] = module.momentum

        elif isinstance(module, torch.nn.LayerNorm):
            params["normalized_shape"] = list(module.normalized_shape)
            params["eps"] = module.eps

        elif isinstance(module, (torch.nn.Dropout, torch.nn.Dropout2d)):
            params["p"] = module.p

        elif isinstance(module, torch.nn.Embedding):
            params["num_embeddings"] = module.num_embeddings
            params["embedding_dim"] = module.embedding_dim

        elif isinstance(module, torch.nn.MultiheadAttention):
            params["embed_dim"] = module.embed_dim
            params["num_heads"] = module.num_heads
            params["dropout"] = module.dropout

        elif isinstance(module, (torch.nn.LSTM, torch.nn.GRU)):
            params["input_size"] = module.input_size
            params["hidden_size"] = module.hidden_size
            params["num_layers"] = module.num_layers
            params["bidirectional"] = module.bidirectional

        return params

    def get_layer(self, layer_id: str) -> LayerInfo | None:
        """Get a specific layer by ID."""
        return self.layers.get(layer_id)

    def get_children(self, layer_id: str) -> list[LayerInfo]:
        """Get the children of a layer."""
        layer = self.layers.get(layer_id)
        if layer is None:
            return []
        return [self.layers[child_id] for child_id in layer.children if child_id in self.layers]

    def get_total_parameters(self) -> int:
        """Get total number of parameters in the model."""
        return sum(p.numel() for p in self.model.parameters())

    def get_model_summary(self) -> dict[str, Any]:
        """Get a summary of the model."""
        root = self.layers.get(self.root_id)
        return {
            "name": self.model_name,
            "class": type(self.model).__name__,
            "total_parameters": self.get_total_parameters(),
            "total_layers": len(self.layers),
            "has_children": root is not None and len(root.children) > 0,
        }

"""FastAPI server for model visualization using torchview."""

from __future__ import annotations

import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING, Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

    import torch.nn as nn

# Global state for the current model
_current_model: nn.Module | None = None
_current_model_name: str = "model"
_current_input_size: list[tuple[int, ...]] | None = None
_cached_graph_data: dict[str, Any] | None = None

# Path to static files
STATIC_DIR = Path(__file__).parent / "_static"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    yield


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="APalysis",
        description="Interactive PyTorch model visualization powered by torchview",
        version="0.2.0",
        lifespan=lifespan,
    )

    # Add CORS middleware for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routes
    @app.get("/api/graph")
    async def get_graph() -> JSONResponse:
        """Get the torchview graph data."""
        if _current_model is None:
            raise HTTPException(status_code=404, detail="No model loaded")

        graph_data = _get_or_build_graph()
        return JSONResponse(content=graph_data)

    @app.get("/api/model/summary")
    async def get_model_summary() -> JSONResponse:
        """Get a summary of the model."""
        if _current_model is None:
            raise HTTPException(status_code=404, detail="No model loaded")

        total_params = sum(p.numel() for p in _current_model.parameters())
        total_layers = sum(1 for _ in _current_model.modules()) - 1  # Exclude root

        return JSONResponse(
            content={
                "name": _current_model_name,
                "class": type(_current_model).__name__,
                "total_parameters": total_params,
                "total_layers": total_layers,
            }
        )

    @app.get("/api/node/{node_id:path}")
    async def get_node_details(node_id: str) -> JSONResponse:
        """Get detailed information about a specific node."""
        if _current_model is None:
            raise HTTPException(status_code=404, detail="No model loaded")

        graph_data = _get_or_build_graph()
        
        # Find the node in the graph data
        for node in graph_data.get("nodes", []):
            if node.get("id") == node_id:
                return JSONResponse(content=node)

        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found")

    # Serve static files if they exist
    if STATIC_DIR.exists() and any(STATIC_DIR.iterdir()):
        # Serve index.html for the root path
        @app.get("/")
        async def serve_root() -> FileResponse:
            index_path = STATIC_DIR / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
            raise HTTPException(status_code=404, detail="Frontend not built")

        # Mount static files for other assets
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

    return app


def _get_or_build_graph() -> dict[str, Any]:
    """Get cached graph data or build it from torchview."""
    global _cached_graph_data

    if _cached_graph_data is not None:
        return _cached_graph_data

    if _current_model is None:
        return {"nodes": [], "edges": [], "subgraphs": {}}

    _cached_graph_data = _build_torchview_graph()
    return _cached_graph_data


def _build_torchview_graph() -> dict[str, Any]:
    """Build graph data from the model using torchview."""
    from torchview import draw_graph

    if _current_model is None:
        return {"nodes": [], "edges": [], "subgraphs": {}}

    # Use provided input size or try to infer it
    input_size = _current_input_size
    if input_size is None:
        # Try to get input size from first parameter shape
        try:
            first_param = next(_current_model.parameters())
            if first_param.dim() >= 2:
                input_size = [(1, first_param.shape[1])]
            else:
                input_size = [(1, 10)]  # Default fallback
        except StopIteration:
            input_size = [(1, 10)]  # Default fallback

    # Generate the computation graph using torchview
    try:
        graph = draw_graph(
            _current_model,
            input_size=input_size,
            graph_name=_current_model_name,
            depth=float("inf"),
            graph_dir="LR",
            expand_nested=True,
            hide_inner_tensors=True,
            hide_module_functions=False,
            roll=True,
            show_shapes=True,
        )

        # Convert to NetworkX and then to JSON-serializable format
        nx_graph = graph.to_networkx()
        
        return _networkx_to_json(nx_graph)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Warning: torchview graph generation failed: {e}")
        return {"nodes": [], "edges": [], "subgraphs": {}, "error": str(e)}


def _sanitize_value(v: Any) -> Any:
    """Sanitize a value for JSON serialization."""
    if isinstance(v, float):
        if v == float("inf"):
            return "inf"
        if v == float("-inf"):
            return "-inf"
        if v != v:  # NaN check
            return None
    if isinstance(v, dict):
        return {k: _sanitize_value(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [_sanitize_value(item) for item in v]
    return v


def _networkx_to_json(G) -> dict[str, Any]:
    """Convert NetworkX graph to JSON-serializable format for frontend."""
    nodes = []
    for node_id, attrs in G.nodes(data=True):
        if attrs.get("node_type") == "tensor":
             is_io = attrs.get("is_input", False) or attrs.get("is_output", False)
             if not is_io:
                 continue

        node_data = {
            "id": node_id,
            "name": attrs.get("name", node_id),
            "nodeType": attrs.get("node_type", "unknown"),
            "depth": attrs.get("depth", 0),
            "subgraph": attrs.get("subgraph"),
            "subgraphLabel": attrs.get("subgraph_label"),
        }

        # Add type-specific attributes
        if attrs.get("node_type") == "tensor":
            node_data["tensorShape"] = attrs.get("tensor_shape", ())
            node_data["isInput"] = attrs.get("is_input", False)
            node_data["isOutput"] = attrs.get("is_output", False)
            node_data["isAux"] = attrs.get("is_aux", False)
        elif attrs.get("node_type") in ("module", "function"):
            node_data["inputShape"] = _serialize_shape(attrs.get("input_shape", []))
            node_data["outputShape"] = _serialize_shape(attrs.get("output_shape", []))
            node_data["typeName"] = attrs.get("type_name", "")
            node_data["isContainer"] = attrs.get("is_container", False)

        nodes.append(node_data)

    edges = []
    for source, target, attrs in G.edges(data=True):
        edges.append({
            "source": source,
            "target": target,
            "count": attrs.get("count", 1),
        })

    # Extract subgraphs info
    subgraphs = {}
    for sg_id, sg_info in G.graph.get("subgraphs", {}).items():
        subgraphs[sg_id] = {
            "label": sg_info.get("label", sg_id),
            "parent": sg_info.get("parent"),
            "moduleName": sg_info.get("module_name", ""),
            "moduleType": sg_info.get("module_type", ""),
            "depth": sg_info.get("depth", 0),
        }

    return {
        "nodes": nodes,
        "edges": edges,
        "subgraphs": subgraphs,
    }


def _serialize_shape(shape: Any) -> list:
    """Serialize shape data to JSON-compatible format."""
    if shape is None:
        return []
    if isinstance(shape, (list, tuple)):
        return [_serialize_shape(s) for s in shape]
    if hasattr(shape, "tolist"):
        return shape.tolist()
    return shape


def set_model(
    model: nn.Module,
    model_name: str = "model",
    input_size: list[tuple[int, ...]] | None = None,
) -> None:
    """
    Set the model to be visualized.

    Args:
        model: The PyTorch model to visualize
        model_name: The name to display for the root node
        input_size: Optional input size for the model (list of tuples)
    """
    global _current_model, _current_model_name, _current_input_size, _cached_graph_data

    _current_model = model
    _current_model_name = model_name
    _current_input_size = input_size
    _cached_graph_data = None  # Clear cache when model changes


def visualize(
    model: nn.Module,
    model_name: str = "model",
    input_size: list[tuple[int, ...]] | None = None,
    port: int = 8765,
    host: str = "127.0.0.1",
    open_browser: bool = True,
    dev: bool = False,
) -> None:
    """
    Launch the visualization webapp for a PyTorch model.

    Args:
        model: The PyTorch model to visualize
        model_name: The name to display for the root node
        input_size: Optional input size for the model (list of tuples)
        port: The port to run the server on
        host: The host to bind to
        open_browser: Whether to automatically open a browser window
        dev: Development mode - runs API only, frontend served separately

    Example:
        >>> import torch
        >>> import apalysis
        >>>
        >>> model = torch.nn.Sequential(
        ...     torch.nn.Linear(10, 20),
        ...     torch.nn.ReLU(),
        ...     torch.nn.Linear(20, 5)
        ... )
        >>> apalysis.visualize(model, model_name="MyModel", input_size=[(1, 10)])
    """
    # Set the model
    set_model(model, model_name, input_size)

    # Create the app
    app = create_app()

    # Print startup info
    api_url = f"http://{host}:{port}"
    frontend_url = "http://localhost:5173"

    total_params = sum(p.numel() for p in model.parameters())

    print(f"\n{'=' * 50}")
    print("  APalysis - Model Visualization (torchview)")
    print(f"{'=' * 50}")
    print(f"  Model: {model_name} ({type(model).__name__})")
    print(f"  Parameters: {total_params:,}")
    print(f"  API: {api_url}")
    if dev:
        print(f"  Frontend: {frontend_url}")
        print("  (Run 'pnpm dev' in frontend/ folder)")
    else:
        has_static = STATIC_DIR.exists() and any(STATIC_DIR.iterdir())
        if not has_static:
            print("  Frontend: Not built (run 'pnpm build' in frontend/)")
    print(f"{'=' * 50}")
    print("  Press Ctrl+C to stop the server")
    print(f"{'=' * 50}\n")

    # Open browser
    if open_browser:
        if dev:
            webbrowser.open(frontend_url)
        else:
            webbrowser.open(api_url)

    # Run the server
    uvicorn.run(app, host=host, port=port, log_level="warning")

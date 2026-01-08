"""Example script demonstrating a model with both ModuleNodes and FunctionNodes."""

import torch
import torch.nn as nn
import torch.nn.functional as F
import apalysis

class MixedNodesModel(nn.Module):
    """
    A model that explicitly mixes nn.Module layers (ModuleNodes)
    and functional operations (FunctionNodes).
    """
    
    def __init__(self):
        super().__init__()
        # These will be rendered as ModuleNodes (green)
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        
        self.fc = nn.Linear(64 * 8 * 8, 10)
        
        # Note: We don't define nn.ReLU() or nn.MaxPool2d() here
        # so we can use their functional versions in forward()
    
    def forward(self, x):
        # Layer 1
        x = self.conv1(x)      # ModuleNode
        x = self.bn1(x)        # ModuleNode
        x = F.relu(x)          # FunctionNode (functional API)
        x = F.max_pool2d(x, 2) # FunctionNode (functional API)
        
        # Layer 2
        x = self.conv2(x)      # ModuleNode
        x = self.bn2(x)        # ModuleNode
        
        # Tensor arithmetic (FunctionNode)
        # Using a tensor method or operator creates a FunctionNode
        x = torch.relu(x)      # FunctionNode (torch API)
        
        # Another functional op
        x = F.max_pool2d(x, 2) # FunctionNode
        
        # Tensor reshaping
        x = x.flatten(1)       # FunctionNode (tensor method)
        
        # Output layer
        x = self.fc(x)         # ModuleNode
        
        return x

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Visualize MixedNodesModel")
    parser.add_argument("--dev", action="store_true", help="Run in dev mode")
    args = parser.parse_args()

    # Create model
    model = MixedNodesModel()
    model.eval()

    print("Starting visualization for MixedNodesModel...")
    print("You should see:")
    print(" - Green nodes for Conv2d, BatchNorm2d, Linear (Modules)")
    print(" - Blue nodes for relu, max_pool2d, flatten (Functions)")

    # Visualize
    # Input: (Batch, Channels, Height, Width) -> (1, 3, 32, 32)
    apalysis.visualize(
        model,
        model_name="MixedNodesModel",
        input_size=[(1, 3, 32, 32)],
        port=8765,
        dev=args.dev,
        open_browser=not args.dev
    )

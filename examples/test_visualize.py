"""Test script for APalysis visualization with torchview."""

import torch
import torch.nn as nn


# =============================================================================
# Comprehensive Model from torchview showcase
# =============================================================================

class RecursiveConvBlock(nn.Module):
    """A convolutional block used recursively."""
    
    def __init__(self, channels: int = 64):
        super().__init__()
        self.conv = nn.Conv2d(channels, channels, kernel_size=3, padding=1)
        self.bn = nn.BatchNorm2d(channels)
        self.relu = nn.ReLU()
    
    def forward(self, x):
        return self.relu(self.bn(self.conv(x)))


class AttentionBranch(nn.Module):
    """Branch with self-attention."""
    
    def __init__(self, embed_dim: int = 64, num_heads: int = 4):
        super().__init__()
        self.attention = nn.MultiheadAttention(embed_dim, num_heads, batch_first=True)
        self.norm = nn.LayerNorm(embed_dim)
        self.ffn = nn.Sequential(
            nn.Linear(embed_dim, embed_dim * 2),
            nn.GELU(),
            nn.Linear(embed_dim * 2, embed_dim),
        )
    
    def forward(self, x):
        # x: (B, seq, embed_dim)
        attn_out, _ = self.attention(x, x, x)
        x = self.norm(x + attn_out)
        x = x + self.ffn(x)
        return x


class ConvBranch(nn.Module):
    """Convolutional branch with pooling."""

    def __init__(self, in_channels: int = 64, out_channels: int = 64):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU()
        self.pool = nn.AdaptiveAvgPool2d((4, 4))
    
    def forward(self, x):
        x = self.relu(self.bn1(self.conv1(x)))
        x = self.relu(self.bn2(self.conv2(x)))
        x = self.pool(x)
        return x


class ComprehensiveModel(nn.Module):
    """
    A comprehensive model combining:
    - ConvNet (input processing)
    - Recursive blocks
    - Branching (conv branch + attention branch)
    - Multiple inputs (image + sequence)
    - Multiple outputs (classification + features)
    - Attention mechanisms
    """
    
    def __init__(
        self,
        num_classes: int = 10,
        num_recursive: int = 3,
        embed_dim: int = 64,
    ):
        super().__init__()
        self.num_recursive = num_recursive
        self.embed_dim = embed_dim
        
        # === Image input processing (ConvNet) ===
        self.input_conv = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
        )
        
        # === Recursive block (applied multiple times) ===
        self.recursive_block = RecursiveConvBlock(channels=64)
        
        # === Branch 1: Convolutional path ===
        self.conv_branch = ConvBranch(in_channels=64, out_channels=64)

        # === Branch 2: Attention path (requires flattening) ===
        self.to_sequence = nn.Sequential(
            nn.AdaptiveAvgPool2d((8, 8)),
            nn.Flatten(2),  # (B, C, H*W)
        )
        self.attention_branch = AttentionBranch(embed_dim=64, num_heads=4)
        
        # === Sequence input processing ===
        self.seq_embedding = nn.Linear(32, embed_dim)
        self.seq_attention = AttentionBranch(embed_dim=embed_dim, num_heads=4)

        # === Combine branches ===
        # Conv branch output: (B, 64, 4, 4) -> flatten -> (B, 1024)
        # Attention branch output: (B, 64, 64) -> mean -> (B, 64)
        # Seq branch output: (B, seq_len, 64) -> mean -> (B, 64)
        self.conv_flatten = nn.Flatten()
        self.combine = nn.Linear(1024 + 64 + 64, 256)
        
        # === Output heads (multiple outputs) ===
        self.classifier = nn.Sequential(
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )
        self.feature_head = nn.Sequential(
            nn.ReLU(),
            nn.Linear(256, 128),
        )
    
    def forward(self, image, sequence):
        """
        Args:
            image: (B, 3, H, W) - Image input
            sequence: (B, seq_len, 32) - Sequence input
        
        Returns:
            classification: (B, num_classes)
            features: (B, 128)
        """
        # Process image input
        x = self.input_conv(image)
        
        # Apply recursive block multiple times
        for _ in range(self.num_recursive):
            x = self.recursive_block(x)

        # Branch 1: Convolutional path
        conv_out = self.conv_branch(x)
        conv_out = self.conv_flatten(conv_out)  # (B, 1024)

        # Branch 2: Attention path on image features
        attn_in = self.to_sequence(x)  # (B, 64, 64)
        attn_in = attn_in.transpose(1, 2)  # (B, 64, 64) - treat as (B, seq, embed)
        attn_out = self.attention_branch(attn_in)
        attn_out = attn_out.mean(dim=1)  # (B, 64)
        
        # Process sequence input
        seq_emb = self.seq_embedding(sequence)  # (B, seq_len, 64)
        seq_out = self.seq_attention(seq_emb)
        seq_out = seq_out.mean(dim=1)  # (B, 64)

        # Combine all branches
        combined = torch.cat([conv_out, attn_out, seq_out], dim=1)
        combined = self.combine(combined)
        
        # Multiple outputs
        classification = self.classifier(combined)
        features = self.feature_head(combined)

        return classification, features


if __name__ == "__main__":
    import argparse
    import apalysis

    parser = argparse.ArgumentParser(description="Test APalysis visualization")
    parser.add_argument("--dev", action="store_true", help="Run in dev mode (frontend served separately)")
    args = parser.parse_args()

    # Create the model
    model = ComprehensiveModel(num_classes=10, num_recursive=3, embed_dim=64)
    model.eval()

    print("Starting APalysis visualization (powered by torchview)...")
    print(f"Model: {type(model).__name__}")
    print(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Launch the visualization with explicit input sizes
    # image: (B, 3, 32, 32), sequence: (B, 16, 32)
    apalysis.visualize(
        model, 
        model_name="ComprehensiveModel",
        input_size=[(1, 3, 32, 32), (1, 16, 32)],
        port=8765,
        dev=args.dev,
        open_browser=not args.dev  # Don't auto-open in dev mode
    )

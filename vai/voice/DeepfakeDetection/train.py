import os
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import wandb
from tqdm import tqdm
import logging
from pathlib import Path
from PIL import Image
import torchvision.transforms as transforms
import gc

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HistogramsDataset(Dataset):
    def __init__(self, root_dir, dataset_type='Training_Set', custom_transform=None):
        self.root_dir = Path(root_dir)
        
        # Use exact directory names matching the structure
        if dataset_type not in ['Training_Set', 'Validation_Set', 'Test_Set']:
            raise ValueError(f"Invalid dataset type: {dataset_type}. Must be one of: Training_Set, Validation_Set, Test_Set")
        
        self.dataset_dir = self.root_dir / dataset_type
        logger.info(f"Loading dataset from: {self.dataset_dir}")
        
        # Define image transformations (default or custom)
        self.transform = custom_transform or transforms.Compose([
            transforms.Resize((128, 128)),
            transforms.Grayscale(num_output_channels=1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])
        
        # Setup paths
        self.real_dir = self.dataset_dir / 'real'
        self.fake_dir = self.dataset_dir / 'fake'
        
        # Get file lists for both PNG and JPG files
        self.real_files = []
        self.fake_files = []
        
        # Image extensions to look for (case-insensitive)
        extensions = ['png', 'jpg', 'jpeg']
        
        # Gather real files
        for ext in extensions:
            patterns = [f'*.{ext.lower()}', f'*.{ext.upper()}']
            for pattern in patterns:
                found_files = list(self.real_dir.glob(pattern))
                self.real_files.extend(found_files)
        
        # Gather fake files
        for ext in extensions:
            patterns = [f'*.{ext.lower()}', f'*.{ext.upper()}']
            for pattern in patterns:
                found_files = list(self.fake_dir.glob(pattern))
                self.fake_files.extend(found_files)
        
        logger.info(f"Found {len(self.real_files)} real and {len(self.fake_files)} fake spectrograms in {dataset_type}")
        
        # Create file paths and labels lists
        self.file_paths = []
        self.labels = []
        
        # Process real files
        for file in self.real_files:
            if self._is_valid_image(file):
                self.file_paths.append(str(file))
                self.labels.append(0)
        
        # Process fake files
        for file in self.fake_files:
            if self._is_valid_image(file):
                self.file_paths.append(str(file))
                self.labels.append(1)
        
        logger.info(f"Successfully loaded {len(self.file_paths)} total valid images")
        
        if len(self.file_paths) == 0:
            raise ValueError(f"No valid images found in {dataset_type} directory")

    def _is_valid_image(self, file_path):
        # Check if the image file is valid
        try:
            with Image.open(file_path) as img:
                img.verify()
            return True
        except Exception as e:
            logger.error(f"Invalid image file {file_path}: {str(e)}")
            return False

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        img_path = self.file_paths[idx]
        label = self.labels[idx]
        
        try:
            with Image.open(img_path) as img:
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                image = self.transform(img)
            return image, torch.tensor(label, dtype=torch.long)
        except Exception as e:
            logger.error(f"Error loading image {img_path}: {str(e)}")
            return torch.zeros(1, 128, 128), torch.tensor(label, dtype=torch.long)

class Deep4SNet(nn.Module):
    def __init__(self, num_classes=2):
        super(Deep4SNet, self).__init__()
        
        self.features = nn.Sequential(
            # First block
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.2),
            
            # Second block
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.3),
            
            # Third block
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.4),
            
            # Fourth block
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Dropout2d(0.5),
        )
        
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

def train_model():
    # Set random seeds for reproducibility
    torch.manual_seed(42)
    torch.cuda.manual_seed(42)
    np.random.seed(42)
    
    # Initialize wandb
    wandb.init(
        project="voice-clone-detection",
        config={
            "learning_rate": 0.0003,
            "epochs": 50,
            "batch_size": 32,
            "model": "Deep4SNet",
            "optimizer": "AdamW",
            "weight_decay": 0.01,
            "scheduler": "CosineAnnealingWarmRestarts"
        }
    )
    
    # Data augmentation transforms
    train_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.Grayscale(num_output_channels=1),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomAffine(degrees=10, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.Grayscale(num_output_channels=1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5], std=[0.5])
    ])
    
    # Set your data directory
    data_root = "../hub/Voice-Authentication/DeepfakeDetection/Data/H-Voice_SiF-Filtered"
    
    # Create datasets with appropriate transforms
    train_dataset = HistogramsDataset(root_dir=data_root, dataset_type='Training_Set', custom_transform=train_transform)
    val_dataset = HistogramsDataset(root_dir=data_root, dataset_type='Validation_Set', custom_transform=val_transform)
    test_dataset = HistogramsDataset(root_dir=data_root, dataset_type='Test_Set', custom_transform=val_transform)
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset, 
        batch_size=32,
        shuffle=True, 
        num_workers=2,
        pin_memory=True
    )
    
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=2, pin_memory=True)
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=2, pin_memory=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = Deep4SNet().to(device)
    
    # Use AdamW optimizer with weight decay
    optimizer = optim.AdamW(
        model.parameters(),
        lr=0.0003,
        weight_decay=0.01,
        amsgrad=True
    )
    
    # Use Cosine Annealing scheduler with warm restarts
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer,
        T_0=10,
        T_mult=2,
        eta_min=1e-6
    )
    
    criterion = nn.CrossEntropyLoss()
    
    # Early stopping parameters
    best_val_acc = 0
    patience = 10
    patience_counter = 0
    
    for epoch in range(50):
        # Training
        model.train()
        train_loss = 0
        correct = 0
        total = 0
        
        progress_bar = tqdm(train_loader, desc=f'Epoch {epoch}')
        for batch_idx, (inputs, targets) in enumerate(progress_bar):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            
            loss.backward()
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
            
            progress_bar.set_postfix({
                'Loss': train_loss/(batch_idx+1),
                'Acc': 100.*correct/total
            })
            
            if batch_idx % 10 == 0:
                torch.cuda.empty_cache()
        
        train_acc = 100. * correct / total
        
        # Validation
        model.eval()
        val_loss = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                total += targets.size(0)
                correct += predicted.eq(targets).sum().item()
        
        val_acc = 100. * correct / total
        
        # Update scheduler
        scheduler.step()
        
        # Log metrics
        wandb.log({
            "epoch": epoch,
            "train_loss": train_loss / len(train_loader),
            "train_acc": train_acc,
            "val_loss": val_loss / len(val_loader),
            "val_acc": val_acc,
            "learning_rate": optimizer.param_groups[0]['lr']
        })
        
        # Early stopping
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
            }, 'best_model.pth')
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print("Early stopping triggered")
                break
        
        logger.info(f'Epoch {epoch}:')
        logger.info(f'Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.2f}%')
        logger.info(f'Val Loss: {val_loss/len(val_loader):.4f}, Val Acc: {val_acc:.2f}%')
    
    # Load best model and evaluate on test set
    checkpoint = torch.load('./best_model.pth')
    model.load_state_dict(checkpoint['model_state_dict'])
    
    # Test evaluation
    model.eval()
    test_loss = 0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            
            test_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
    
    test_acc = 100. * correct / total
    logger.info(f'Final Test Accuracy: {test_acc:.2f}%')
    wandb.log({"test_acc": test_acc, "test_loss": test_loss / len(test_loader)})

if __name__ == "__main__":
    train_model()
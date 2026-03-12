# ================================================================
# CORAL CLASSIFICATION — Full Pipeline (Single Cell)
# ResNet-50 + EfficientNet-B4 Ensemble | Early Stopping | TTA
# Google Drive Output
# ================================================================

# --- Mount Drive ---
from google.colab import drive
drive.mount('/content/drive')

import os, copy, shutil, warnings
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms, models
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
warnings.filterwarnings('ignore')

# ================================================================
# CONFIG — edit these paths
# ================================================================
DRIVE_BASE          = '/content/drive/MyDrive'
TRAIN_DIR           = f'/content/drive/MyDrive/coral/coral_classification_project/original_dataset/Bleached Corals and Healthy Corals Classification/Training'
VAL_DIR             = f'/content/drive/MyDrive/coral/coral_classification_project/original_dataset/Bleached Corals and Healthy Corals Classification/Validation'
TEST_DIR            = f'/content/drive/MyDrive/coral/coral_classification_project/original_dataset/Bleached Corals and Healthy Corals Classification/Testing'
OUTPUT_DIR          = f'{DRIVE_BASE}/CoralClassifier_Outputs'

IMG_SIZE            = 224
BATCH_SIZE          = 32
NUM_EPOCHS          = 65
NUM_CLASSES         = 2
EARLY_STOP_PATIENCE = 10
CLASSES             = ['bleached_corals', 'healthy_corals']

os.makedirs(OUTPUT_DIR, exist_ok=True)
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f'Device  : {DEVICE}')
if DEVICE.type == 'cuda':
    print(f'GPU     : {torch.cuda.get_device_name(0)}')
print(f'Outputs : {OUTPUT_DIR}')

# ================================================================
# DRIVE SAVE HELPERS
# ================================================================
def save_to_drive(local_path, filename=None):
    fname      = filename or os.path.basename(local_path)
    drive_path = os.path.join(OUTPUT_DIR, fname)
    shutil.copy2(local_path, drive_path)
    print(f'  💾 Saved to Drive: {drive_path}')
    return drive_path

def savefig_to_drive(filename):
    local_path = f'/content/{filename}'
    plt.savefig(local_path, dpi=150, bbox_inches='tight')
    save_to_drive(local_path)
    plt.show()

# ================================================================
# EARLY STOPPING
# ================================================================
class EarlyStopping:
    def __init__(self, patience=10, model_name='model', verbose=True):
        self.patience     = patience
        self.model_name   = model_name
        self.verbose      = verbose
        self.counter      = 0
        self.best_val_acc = 0.0
        self.best_weights = None
        self.early_stop   = False
        self.best_epoch   = 0
        self.ckpt_path    = f'/content/coral_{model_name}_best.pth'

    def __call__(self, val_acc, model, epoch):
        if val_acc > self.best_val_acc:
            improvement       = val_acc - self.best_val_acc
            self.best_val_acc = val_acc
            self.best_weights = copy.deepcopy(model.state_dict())
            self.best_epoch   = epoch
            self.counter      = 0
            torch.save(self.best_weights, self.ckpt_path)
            save_to_drive(self.ckpt_path)
            if self.verbose:
                print(f'   ✅ Val acc +{improvement:.4f} → best={val_acc:.4f} '
                      f'(epoch {epoch}) — checkpoint saved to Drive')
        else:
            self.counter += 1
            if self.verbose:
                print(f'   ⏳ No improvement {self.counter}/{self.patience} '
                      f'(best={self.best_val_acc:.4f} at epoch {self.best_epoch})')
            if self.counter >= self.patience:
                self.early_stop = True

    def restore_best(self, model):
        if self.best_weights is not None:
            model.load_state_dict(self.best_weights)
            print(f'\n🔁 Restored best weights from epoch {self.best_epoch} '
                  f'(val acc = {self.best_val_acc:.4f})')
        return model

# ================================================================
# AUGMENTATION & TRANSFORMS
# ================================================================
train_transforms = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.3),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.15, hue=0.05),
    transforms.RandomGrayscale(p=0.05),
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
])

val_test_transforms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

tta_transforms = [
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)), transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)), transforms.RandomHorizontalFlip(p=1.0),
        transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
    transforms.Compose([
        transforms.Resize((256, 256)), transforms.CenterCrop(IMG_SIZE),
        transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
    transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)), transforms.RandomVerticalFlip(p=1.0),
        transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
]

# ================================================================
# DATASETS & DATALOADERS
# ================================================================
train_dataset  = datasets.ImageFolder(TRAIN_DIR, transform=train_transforms)
val_dataset    = datasets.ImageFolder(VAL_DIR,   transform=val_test_transforms)
test_dataset   = datasets.ImageFolder(TEST_DIR,  transform=val_test_transforms)

class_counts   = np.bincount(train_dataset.targets)
class_weights  = 1.0 / class_counts
sample_weights = [class_weights[t] for t in train_dataset.targets]
sampler        = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, sampler=sampler,  num_workers=2, pin_memory=True)
val_loader   = DataLoader(val_dataset,   batch_size=BATCH_SIZE, shuffle=False,    num_workers=2, pin_memory=True)
test_loader  = DataLoader(test_dataset,  batch_size=BATCH_SIZE, shuffle=False,    num_workers=2, pin_memory=True)

print(f'\nTrain : {len(train_dataset)} | Val : {len(val_dataset)} | Test : {len(test_dataset)}')
print(f'Classes: {train_dataset.classes}')

# ================================================================
# MODEL BUILDERS
# ================================================================
def build_resnet50(freeze_backbone=True):
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    if freeze_backbone:
        for param in model.parameters():
            param.requires_grad = False
    in_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Linear(in_features, 512),
        nn.BatchNorm1d(512), nn.ReLU(), nn.Dropout(0.4),
        nn.Linear(512, 128),
        nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.3),
        nn.Linear(128, NUM_CLASSES)
    )
    return model.to(DEVICE)

def build_efficientnet_b4(freeze_backbone=True):
    model = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1)
    if freeze_backbone:
        for param in model.parameters():
            param.requires_grad = False
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(in_features, 256),
        nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
        nn.Linear(256, NUM_CLASSES)
    )
    return model.to(DEVICE)

# ================================================================
# TRAIN / EVAL HELPERS
# ================================================================
def unfreeze_layers(model, layers):
    for name, param in model.named_parameters():
        for layer in layers:
            if layer in name:
                param.requires_grad = True

def unfreeze_all(model):
    for param in model.parameters():
        param.requires_grad = True

def train_one_epoch(model, loader, optimizer, criterion, scaler):
    model.train()
    total_loss, correct, total = 0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        with torch.cuda.amp.autocast(enabled=DEVICE.type == 'cuda'):
            outputs = model(imgs)
            loss    = criterion(outputs, labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        total_loss += loss.item() * imgs.size(0)
        correct    += (outputs.argmax(1) == labels).sum().item()
        total      += imgs.size(0)
    return total_loss / total, correct / total

def evaluate(model, loader, criterion):
    model.eval()
    total_loss, correct, total = 0, 0, 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            outputs    = model(imgs)
            loss       = criterion(outputs, labels)
            total_loss += loss.item() * imgs.size(0)
            correct    += (outputs.argmax(1) == labels).sum().item()
            total      += imgs.size(0)
    return total_loss / total, correct / total

# ================================================================
# TRAINING — 3-phase progressive unfreezing + early stopping
# ================================================================
def train_model(model, model_name='resnet50'):
    criterion     = nn.CrossEntropyLoss(label_smoothing=0.1)
    scaler        = torch.cuda.amp.GradScaler(enabled=DEVICE.type == 'cuda')
    early_stopper = EarlyStopping(patience=EARLY_STOP_PATIENCE, model_name=model_name)
    history       = {'train_loss': [], 'val_loss': [], 'train_acc': [], 'val_acc': []}

    def run_phase(start, end, optimizer, scheduler, label):
        print(f'\n── {label} (epochs {start}–{end}) ──')
        for epoch in range(start, end + 1):
            tr_loss, tr_acc = train_one_epoch(model, train_loader, optimizer, criterion, scaler)
            vl_loss, vl_acc = evaluate(model, val_loader, criterion)
            scheduler.step()
            history['train_loss'].append(tr_loss)
            history['val_loss'].append(vl_loss)
            history['train_acc'].append(tr_acc)
            history['val_acc'].append(vl_acc)
            print(f'  Epoch {epoch:02d}/{NUM_EPOCHS} | '
                  f'Train {tr_acc:.4f} loss {tr_loss:.4f} | '
                  f'Val   {vl_acc:.4f} loss {vl_loss:.4f}')
            early_stopper(vl_acc, model, epoch)
            if early_stopper.early_stop:
                print(f'\n🛑 Early stopping at epoch {epoch}. '
                      f'Best was epoch {early_stopper.best_epoch} ({early_stopper.best_val_acc:.4f})')
                return True
        return False

    # Phase 1 — Head warmup (epochs 1–10)
    opt = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3, weight_decay=1e-4)
    sch = CosineAnnealingWarmRestarts(opt, T_0=10)
    if run_phase(1, 10, opt, sch, 'Phase 1 — Head warmup'):
        return early_stopper.restore_best(model), history, early_stopper.best_epoch

    # Phase 2 — Unfreeze top layers (epochs 11–30)
    if model_name == 'resnet50':
        unfreeze_layers(model, ['layer4', 'fc'])
    else:
        unfreeze_layers(model, ['features.8', 'features.7', 'classifier'])
    opt = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=5e-5, weight_decay=1e-4)
    sch = CosineAnnealingWarmRestarts(opt, T_0=20)
    if run_phase(11, 30, opt, sch, 'Phase 2 — Top layers unfrozen'):
        return early_stopper.restore_best(model), history, early_stopper.best_epoch

    # Phase 3 — Full fine-tune (epochs 31–65)
    unfreeze_all(model)
    opt = optim.AdamW(model.parameters(), lr=1e-5, weight_decay=1e-4)
    sch = CosineAnnealingWarmRestarts(opt, T_0=35)
    run_phase(31, NUM_EPOCHS, opt, sch, 'Phase 3 — Full fine-tune')

    model = early_stopper.restore_best(model)
    final_path = f'/content/coral_{model_name}_final.pth'
    torch.save(model.state_dict(), final_path)
    save_to_drive(final_path)
    return model, history, early_stopper.best_epoch

# ================================================================
# PLOTS
# ================================================================
def plot_training(history, model_name, best_epoch):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle(f'{model_name} — Training History', fontsize=13)
    epochs = range(1, len(history['train_acc']) + 1)
    for ax, metric, title in [(ax1, 'acc', 'Accuracy'), (ax2, 'loss', 'Loss')]:
        ax.plot(epochs, history[f'train_{metric}'], label='Train', linewidth=2)
        ax.plot(epochs, history[f'val_{metric}'],   label='Val',   linewidth=2)
        ax.axvline(10, color='gray', linestyle='--', alpha=0.4, label='Phase 2')
        ax.axvline(30, color='gray', linestyle=':',  alpha=0.4, label='Phase 3')
        if best_epoch <= len(history['train_acc']):
            ax.axvline(best_epoch, color='green', linestyle='-', alpha=0.7, label=f'Best ep {best_epoch}')
        ax.set_title(title); ax.set_xlabel('Epoch')
        ax.legend(); ax.grid(True, alpha=0.3)
    plt.tight_layout()
    savefig_to_drive(f'training_curves_{model_name}.png')

def plot_confusion_matrix(y_true, y_pred, title='Confusion Matrix'):
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=CLASSES, yticklabels=CLASSES)
    plt.title(title); plt.ylabel('True'); plt.xlabel('Predicted')
    plt.tight_layout()
    savefig_to_drive(f'confusion_{title.replace(" ", "_")}.png')

# ================================================================
# ENSEMBLE + TTA INFERENCE
# ================================================================
def predict_ensemble_tta(models_list, image_folder):
    all_model_preds = []
    ground_truth    = None
    for mdl in models_list:
        mdl.eval()
        model_tta_preds = []
        for tta_tf in tta_transforms:
            dataset   = datasets.ImageFolder(image_folder, transform=tta_tf)
            loader    = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)
            tta_probs = []
            with torch.no_grad():
                for imgs, _ in loader:
                    probs = torch.softmax(mdl(imgs.to(DEVICE)), dim=1).cpu().numpy()
                    tta_probs.extend(probs)
            model_tta_preds.append(np.array(tta_probs))
            if ground_truth is None:
                ground_truth = []
                for _, lbls in DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False):
                    ground_truth.extend(lbls.numpy())
                ground_truth = np.array(ground_truth)
        all_model_preds.append(np.mean(model_tta_preds, axis=0))
    return np.argmax(np.mean(all_model_preds, axis=0), axis=1), ground_truth

# ================================================================
# RUN — Train both models
# ================================================================
print('\n' + '='*55)
print('  Model 1: ResNet-50')
print('='*55)
resnet = build_resnet50(freeze_backbone=True)
resnet, resnet_hist, resnet_best_ep = train_model(resnet, 'resnet50')
plot_training(resnet_hist, 'ResNet50', resnet_best_ep)

print('\n' + '='*55)
print('  Model 2: EfficientNet-B4')
print('='*55)
effnet = build_efficientnet_b4(freeze_backbone=True)
effnet, effnet_hist, effnet_best_ep = train_model(effnet, 'efficientnet_b4')
plot_training(effnet_hist, 'EfficientNet_B4', effnet_best_ep)

# ================================================================
# EVALUATE
# ================================================================
criterion = nn.CrossEntropyLoss()
_, r_acc  = evaluate(resnet, test_loader, criterion)
_, e_acc  = evaluate(effnet,  test_loader, criterion)
print(f'\nResNet-50   Test Acc (no TTA): {r_acc:.4f}')
print(f'EffNet-B4   Test Acc (no TTA): {e_acc:.4f}')

print('\n── Ensemble + TTA ──')
ens_preds, labels = predict_ensemble_tta([resnet, effnet], TEST_DIR)
report = classification_report(labels, ens_preds, target_names=CLASSES, digits=4)
print(report)

# Save classification report to Drive
report_path = '/content/classification_report.txt'
with open(report_path, 'w') as f:
    f.write(f'ResNet-50   Test Acc (no TTA): {r_acc:.4f}\n')
    f.write(f'EffNet-B4   Test Acc (no TTA): {e_acc:.4f}\n\n')
    f.write('Ensemble + TTA Classification Report:\n')
    f.write(report)
save_to_drive(report_path)

# Confusion matrices
plot_confusion_matrix(labels, ens_preds, 'Ensemble TTA')
r_preds, _ = predict_ensemble_tta([resnet], TEST_DIR)
e_preds, _ = predict_ensemble_tta([effnet],  TEST_DIR)
plot_confusion_matrix(labels, r_preds, 'ResNet50 TTA')
plot_confusion_matrix(labels, e_preds, 'EfficientNet B4 TTA')

# ================================================================
# SUMMARY
# ================================================================
print('\n' + '='*55)
print('  All outputs saved to Google Drive:')
print('='*55)
for f in sorted(os.listdir(OUTPUT_DIR)):
    size_kb = os.path.getsize(os.path.join(OUTPUT_DIR, f)) / 1024
    print(f'  📄 {f:50s} {size_kb:>8.1f} KB')
print(f'\n📁 Location: {OUTPUT_DIR}')

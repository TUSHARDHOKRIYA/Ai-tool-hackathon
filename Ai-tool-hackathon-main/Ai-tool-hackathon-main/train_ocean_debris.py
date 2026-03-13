"""
Ocean Debris YOLO Training Script — Google Colab
Run: python train_ocean_debris.py
"""

# ─── 0. Install dependencies ──────────────────────────────────────────────────
import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "ultralytics", "-q"])

# ─── 1. Imports ───────────────────────────────────────────────────────────────
import os, zipfile, shutil, glob, yaml, random
import cv2
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from google.colab import files
import torch
from ultralytics import YOLO

# ─── 2. GPU check ─────────────────────────────────────────────────────────────
print("=" * 60)
print(f"CUDA Available : {torch.cuda.is_available()}")
print(f"GPU            : {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
print("=" * 60)

# ══════════════════════════════════════════════════════════════════════════════
#  USER CONFIG — Edit these before running
# ══════════════════════════════════════════════════════════════════════════════
CLASS_NAMES = [
    "plastic_bottle",
    "plastic_bag",
    "fishing_net",
    "rope",
    "foam",
    "metal_debris",
    "wood_debris",
    "other_debris",
]

MODEL       = "yolo11m.pt"   # yolo11n/s/m/l/x  or  yolov8n/s/m/l/x
EPOCHS      = 100
IMG_SIZE    = 640
BATCH_SIZE  = 16
WORKERS     = 4
PROJECT     = "/content/runs/detect"
RUN_NAME    = "ocean_debris_v1"
DEVICE      = 0
# ══════════════════════════════════════════════════════════════════════════════


# ─── 3. Upload & extract dataset ──────────────────────────────────────────────
print("\n📁 Upload your dataset ZIP file...")
uploaded = files.upload()
zip_name = list(uploaded.keys())[0]

EXTRACT_ROOT = "/content/drive/MyDrive/DETECTION.v1i.yolov11"
os.makedirs(EXTRACT_ROOT, exist_ok=True)

with zipfile.ZipFile(zip_name, "r") as z:
    z.extractall(EXTRACT_ROOT)

print("✅ ZIP extracted to:", EXTRACT_ROOT)


# ─── 4. Auto-detect dataset root (handles nested subfolders) ──────────────────
def find_dataset_root(base: str) -> str:
    """
    Walk extracted directory and return the folder that contains
    ALL THREE of: train/images, valid/images, test/images
    """
    for dirpath, dirnames, _ in os.walk(base):
        has_train = os.path.isdir(os.path.join(dirpath, "train", "images"))
        has_valid = os.path.isdir(os.path.join(dirpath, "valid", "images"))
        has_test  = os.path.isdir(os.path.join(dirpath, "test",  "images"))
        if has_train and has_valid and has_test:
            return dirpath
    return None

DATASET_PATH = find_dataset_root(EXTRACT_ROOT)

if DATASET_PATH is None:
    # Fallback: check alternate valid folder name "val" instead of "valid"
    for dirpath, dirnames, _ in os.walk(EXTRACT_ROOT):
        has_train = os.path.isdir(os.path.join(dirpath, "train", "images"))
        has_val   = os.path.isdir(os.path.join(dirpath, "val",   "images"))
        has_test  = os.path.isdir(os.path.join(dirpath, "test",  "images"))
        if has_train and has_val and has_test:
            # Rename val → valid for consistency
            os.rename(
                os.path.join(dirpath, "val"),
                os.path.join(dirpath, "valid"),
            )
            DATASET_PATH = dirpath
            break

if DATASET_PATH is None:
    raise RuntimeError(
        "❌ Could not find train/valid/test folders in the ZIP.\n"
        f"   Contents of {EXTRACT_ROOT}:\n" +
        "\n".join(f"   {p}" for p in sorted(glob.glob(f"{EXTRACT_ROOT}/**", recursive=True))[:30])
    )

print(f"\n✅ Dataset root found: {DATASET_PATH}")

# Print split stats
for split in ["train", "valid", "test"]:
    img_dir = os.path.join(DATASET_PATH, split, "images")
    lbl_dir = os.path.join(DATASET_PATH, split, "labels")
    imgs = len(os.listdir(img_dir)) if os.path.exists(img_dir) else 0
    lbls = len(os.listdir(lbl_dir)) if os.path.exists(lbl_dir) else 0
    print(f"  [{split:5s}]  images: {imgs:4d}  |  labels: {lbls:4d}")


# ─── 5. Auto-detect classes from label files (if CLASS_NAMES not set) ─────────
def detect_classes_from_labels(dataset_path: str) -> int:
    max_cls = -1
    for lbl in glob.glob(f"{dataset_path}/train/labels/*.txt"):
        with open(lbl) as f:
            for line in f:
                parts = line.strip().split()
                if parts:
                    max_cls = max(max_cls, int(parts[0]))
    return max_cls + 1

# Check if provided CLASS_NAMES count matches labels
detected_nc = detect_classes_from_labels(DATASET_PATH)
if detected_nc != len(CLASS_NAMES):
    print(f"\n⚠️  Detected {detected_nc} classes in labels but CLASS_NAMES has {len(CLASS_NAMES)}.")
    print(f"   Overriding nc to {detected_nc}. Update CLASS_NAMES in config if needed.")
    # Pad or trim class names
    if detected_nc > len(CLASS_NAMES):
        CLASS_NAMES += [f"class_{i}" for i in range(len(CLASS_NAMES), detected_nc)]
    else:
        CLASS_NAMES = CLASS_NAMES[:detected_nc]


# ─── 6. Generate data.yaml ────────────────────────────────────────────────────
yaml_path = "/content/data.yaml"
data_yaml = {
    "path"  : DATASET_PATH,
    "train" : "train/images",
    "val"   : "valid/images",
    "test"  : "test/images",
    "nc"    : len(CLASS_NAMES),
    "names" : CLASS_NAMES,
}

with open(yaml_path, "w") as f:
    yaml.dump(data_yaml, f, default_flow_style=False)

print(f"\n✅ data.yaml written to {yaml_path}")
with open(yaml_path) as f:
    print(f.read())


# ─── 7. Visualize sample images ───────────────────────────────────────────────
def visualize_samples(dataset_path, split="train", num_samples=6):
    img_dir = Path(dataset_path) / split / "images"
    lbl_dir = Path(dataset_path) / split / "labels"
    images  = list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png"))
    if not images:
        print(f"⚠️  No images found in {img_dir}")
        return

    samples = random.sample(images, min(num_samples, len(images)))
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    fig.suptitle(f"🌊 Ocean Debris — {split} samples", fontsize=16, fontweight="bold")
    colors = plt.cm.tab10(np.linspace(0, 1, len(CLASS_NAMES)))

    for ax, img_path in zip(axes.flat, samples):
        img = cv2.imread(str(img_path))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        lbl_path = lbl_dir / (img_path.stem + ".txt")
        if lbl_path.exists():
            with open(lbl_path) as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 5:
                        continue
                    cls = int(parts[0])
                    cx, cy, bw, bh = map(float, parts[1:5])
                    x1 = int((cx - bw / 2) * w)
                    y1 = int((cy - bh / 2) * h)
                    x2 = int((cx + bw / 2) * w)
                    y2 = int((cy + bh / 2) * h)
                    color = tuple(
                        (np.array(colors[cls % len(colors)][:3]) * 255).astype(int).tolist()
                    )
                    cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
                    label = CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else str(cls)
                    cv2.putText(img, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        ax.imshow(img)
        ax.set_title(img_path.name, fontsize=8)
        ax.axis("off")

    plt.tight_layout()
    out = "/content/sample_visualization.png"
    plt.savefig(out, dpi=150, bbox_inches="tight")
    plt.show()
    print(f"✅ Saved: {out}")

visualize_samples(DATASET_PATH, split="train")


# ─── 8. Train ─────────────────────────────────────────────────────────────────
print("\n🏋️  Starting training...")
model = YOLO(MODEL)

results = model.train(
    data         = yaml_path,
    epochs       = EPOCHS,
    imgsz        = IMG_SIZE,
    batch        = BATCH_SIZE,
    workers      = WORKERS,
    device       = DEVICE,
    project      = PROJECT,
    name         = RUN_NAME,
    exist_ok     = True,

    # Optimizer
    optimizer    = "AdamW",
    lr0          = 0.001,
    lrf          = 0.01,
    momentum     = 0.937,
    weight_decay = 0.0005,
    warmup_epochs     = 3,
    warmup_momentum   = 0.8,
    warmup_bias_lr    = 0.1,

    # Augmentation — tuned for ocean/water scenes
    hsv_h        = 0.02,
    hsv_s        = 0.7,
    hsv_v        = 0.4,
    degrees      = 10.0,
    translate    = 0.1,
    scale        = 0.5,
    shear        = 2.0,
    perspective  = 0.0001,
    flipud       = 0.5,
    fliplr       = 0.5,
    mosaic       = 1.0,
    mixup        = 0.15,
    copy_paste   = 0.1,

    # Loss
    box          = 7.5,
    cls          = 0.5,
    dfl          = 1.5,

    # Misc
    patience     = 30,
    save         = True,
    save_period  = 10,
    cache        = True,
    amp          = True,
    plots        = True,
    verbose      = True,
)

print("\n✅ Training complete!")


# ─── 9. Validate ──────────────────────────────────────────────────────────────
best_weights = f"{PROJECT}/{RUN_NAME}/weights/best.pt"
best_model   = YOLO(best_weights)

print("\n📊 Validation on val split...")
val_results = best_model.val(
    data      = yaml_path,
    imgsz     = IMG_SIZE,
    batch     = BATCH_SIZE,
    device    = DEVICE,
    split     = "val",
    plots     = True,
    save_json = True,
)
print(f"  mAP@0.5      : {val_results.box.map50:.4f}")
print(f"  mAP@0.5:0.95 : {val_results.box.map:.4f}")
print(f"  Precision    : {val_results.box.mp:.4f}")
print(f"  Recall       : {val_results.box.mr:.4f}")

print("\n🧪 Evaluation on test split...")
test_results = best_model.val(
    data      = yaml_path,
    imgsz     = IMG_SIZE,
    batch     = BATCH_SIZE,
    device    = DEVICE,
    split     = "test",
    plots     = True,
    save_json = True,
    name      = "test_eval",
)
print(f"  mAP@0.5      : {test_results.box.map50:.4f}")
print(f"  mAP@0.5:0.95 : {test_results.box.map:.4f}")
print(f"  Precision    : {test_results.box.mp:.4f}")
print(f"  Recall       : {test_results.box.mr:.4f}")


# ─── 10. Predict on test samples ──────────────────────────────────────────────
test_images = (
    glob.glob(f"{DATASET_PATH}/test/images/*.jpg")
    + glob.glob(f"{DATASET_PATH}/test/images/*.png")
)
sample_test = random.sample(test_images, min(6, len(test_images)))

pred_results = best_model.predict(
    source    = sample_test,
    imgsz     = IMG_SIZE,
    conf      = 0.25,
    iou       = 0.45,
    device    = DEVICE,
    save      = True,
    save_conf = True,
    project   = "/content/runs/predict",
    name      = "ocean_debris_test",
)

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle("🌊 Ocean Debris — Predictions", fontsize=16, fontweight="bold")
for ax, r in zip(axes.flat, pred_results):
    img = cv2.cvtColor(r.plot(), cv2.COLOR_BGR2RGB)
    ax.imshow(img)
    ax.set_title(f"Detections: {len(r.boxes)}", fontsize=9)
    ax.axis("off")
plt.tight_layout()
plt.savefig("/content/predictions_preview.png", dpi=150, bbox_inches="tight")
plt.show()


# ─── 11. Training curves ──────────────────────────────────────────────────────
import pandas as pd

results_csv = f"{PROJECT}/{RUN_NAME}/results.csv"
df = pd.read_csv(results_csv)
df.columns = df.columns.str.strip()

fig, axes = plt.subplots(2, 3, figsize=(18, 10))
fig.suptitle("Training Metrics — Ocean Debris YOLO", fontsize=14, fontweight="bold")

metrics = [
    ("train/box_loss",   "Train Box Loss",   "#e74c3c"),
    ("train/cls_loss",   "Train Class Loss", "#e67e22"),
    ("metrics/mAP50(B)", "mAP@0.5",          "#2ecc71"),
    ("metrics/mAP50-95(B)", "mAP@0.5:0.95", "#27ae60"),
    ("metrics/precision(B)", "Precision",    "#3498db"),
    ("metrics/recall(B)",    "Recall",       "#9b59b6"),
]

for ax, (col, title, color) in zip(axes.flat, metrics):
    if col in df.columns:
        ax.plot(df["epoch"], df[col], color=color, linewidth=2)
        ax.set_title(title, fontweight="bold")
        ax.set_xlabel("Epoch")
        ax.grid(True, alpha=0.3)
        ax.spines[["top", "right"]].set_visible(False)

plt.tight_layout()
plt.savefig("/content/training_curves.png", dpi=150, bbox_inches="tight")
plt.show()
print("✅ Saved: /content/training_curves.png")


# ─── 12. Export & download ────────────────────────────────────────────────────
best_model.export(format="onnx", imgsz=IMG_SIZE, simplify=True)
shutil.copy(best_weights, "/content/best_ocean_debris.pt")
shutil.make_archive("/content/ocean_debris_run", "zip", f"{PROJECT}/{RUN_NAME}")

print("\n📥 Downloading weights and plots...")
files.download("/content/best_ocean_debris.pt")
files.download("/content/training_curves.png")
files.download("/content/predictions_preview.png")
# files.download("/content/ocean_debris_run.zip")  # Uncomment for full run

print("\n🎉 All done!")

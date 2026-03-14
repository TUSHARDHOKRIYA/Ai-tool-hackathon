# ╔══════════════════════════════════════════════════════════════════╗
# ║        CORAL DETECTION – YOLOv11 | Google Colab Training        ║
# ╚══════════════════════════════════════════════════════════════════╝

# ─────────────────────────────────────────────
# CELL 1 – Mount Google Drive & Set Dataset Path
# ─────────────────────────────────────────────
from google.colab import drive
drive.mount('/content/drive', force_remount=True)

import os

DATASET_PATH = "/content/drive/MyDrive/Coral Detection Yolo11 dataset/Coral Detection ver 2.v7i.yolov11 (1)"

assert os.path.exists(f"{DATASET_PATH}/data.yaml"), \
    f"data.yaml not found in {DATASET_PATH}"

print("✓ Drive mounted")
print("✓ Dataset found:", DATASET_PATH)
print("  Contents:", os.listdir(DATASET_PATH))

# ─────────────────────────────────────────────
# CELL 2 – Install Dependencies
# ─────────────────────────────────────────────
import subprocess
subprocess.run(["pip", "install", "ultralytics", "-q"])

import torch
print(f"✓ PyTorch : {torch.__version__}")
print(f"✓ CUDA    : {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"✓ GPU     : {torch.cuda.get_device_name(0)}")
    print(f"✓ VRAM    : {torch.cuda.get_device_properties(0).total_memory/1e9:.1f} GB")

# ─────────────────────────────────────────────
# CELL 3 – Fix data.yaml Paths for Colab
# ─────────────────────────────────────────────
import yaml
from pathlib import Path

yaml_path = f"{DATASET_PATH}/data.yaml"
with open(yaml_path) as f:
    data = yaml.safe_load(f)

print("Original data.yaml:")
print(yaml.dump(data))

data["train"] = f"{DATASET_PATH}/train/images"
data["val"]   = f"{DATASET_PATH}/valid/images"
data["test"]  = f"{DATASET_PATH}/test/images"

for split in ["train", "val", "test"]:
    exists = os.path.exists(data[split])
    print(f"✓ {split:5s} → {data[split]}  (exists: {exists})")
    if not exists:
        print(f"  ⚠️  WARNING: {split} path does not exist!")

fixed_yaml = "/content/data.yaml"
with open(fixed_yaml, "w") as f:
    yaml.dump(data, f)

print(f"\n✓ Fixed data.yaml saved → {fixed_yaml}")

# ─────────────────────────────────────────────
# CELL 4 – Copy Dataset to Local Colab Disk
#           (fixes slow Drive I/O + EOFError)
# ─────────────────────────────────────────────
import shutil

LOCAL_DATASET = "/content/coral_dataset"

if os.path.exists(LOCAL_DATASET):
    shutil.rmtree(LOCAL_DATASET)

print("⏳ Copying dataset from Drive to local disk (faster I/O) ...")
shutil.copytree(DATASET_PATH, LOCAL_DATASET)
print("✓ Dataset copied to:", LOCAL_DATASET)
print("  Contents:", os.listdir(LOCAL_DATASET))

# ─────────────────────────────────────────────
# CELL 5 – Scan & Remove Corrupted Label Files
# ─────────────────────────────────────────────
import glob

def clean_dataset(dataset_root):
    removed_labels  = []
    removed_images  = []
    empty_labels    = []

    for split in ["train", "valid", "test"]:
        label_dir = os.path.join(dataset_root, split, "labels")
        image_dir = os.path.join(dataset_root, split, "images")

        if not os.path.exists(label_dir):
            print(f"  ⚠️  label dir not found: {label_dir}")
            continue

        label_files = glob.glob(f"{label_dir}/*.txt")
        print(f"\n  [{split}] scanning {len(label_files)} label files ...")

        for lf in label_files:
            # Check for empty or corrupted label files
            try:
                size = os.path.getsize(lf)
                if size == 0:
                    empty_labels.append(lf)
                    # Remove the label file
                    os.remove(lf)
                    removed_labels.append(lf)
                    # Remove the matching image too
                    stem = Path(lf).stem
                    for ext in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
                        img_path = os.path.join(image_dir, stem + ext)
                        if os.path.exists(img_path):
                            os.remove(img_path)
                            removed_images.append(img_path)
                            break
            except Exception as e:
                print(f"  ⚠️  Error reading {lf}: {e}")
                os.remove(lf)
                removed_labels.append(lf)

        # Also check for .npy / cache files and delete them
        for cache_file in glob.glob(f"{label_dir}/*.npy") + \
                          glob.glob(f"{dataset_root}/{split}/*.cache") + \
                          glob.glob(f"{dataset_root}/{split}/labels.cache"):
            os.remove(cache_file)
            print(f"  🗑️  Removed cache: {cache_file}")

    print(f"\n✓ Cleanup complete")
    print(f"  Empty/corrupt labels removed : {len(removed_labels)}")
    print(f"  Matching images removed      : {len(removed_images)}")
    return len(removed_labels)

# Delete any stale YOLO cache files from Drive copy too
for cache in glob.glob(f"{LOCAL_DATASET}/**/*.cache", recursive=True):
    os.remove(cache)
    print(f"🗑️  Removed cache: {cache}")

removed = clean_dataset(LOCAL_DATASET)
print(f"\n{'✓ Dataset is clean' if removed == 0 else f'⚠️  Removed {removed} bad files — dataset cleaned'}")

# ─────────────────────────────────────────────
# CELL 6 – Update data.yaml to Local Paths
# ─────────────────────────────────────────────
data["train"] = f"{LOCAL_DATASET}/train/images"
data["val"]   = f"{LOCAL_DATASET}/valid/images"
data["test"]  = f"{LOCAL_DATASET}/test/images"

with open(fixed_yaml, "w") as f:
    yaml.dump(data, f)

print("✓ data.yaml updated to local paths")
for split in ["train", "val", "test"]:
    count = len(glob.glob(f"{data[split]}/*"))
    print(f"  {split:5s} → {data[split]}  ({count} images)")

# ─────────────────────────────────────────────
# CELL 7 – Configuration
# ─────────────────────────────────────────────
CONFIG = {
    "data_yaml"    : "/content/data.yaml",
    "project_dir"  : "/content/drive/MyDrive/coral_runs",   # saves to Drive
    "run_name"     : "yolo11_coral_v1",
    "model"        : "yolo11m.pt",
    "epochs"       : 150,
    "imgsz"        : 640,
    "batch"        : 16,
    "workers"      : 2,
    "optimizer"    : "AdamW",
    "lr0"          : 0.001,
    "lrf"          : 0.01,
    "momentum"     : 0.937,
    "weight_decay" : 0.0005,
    "warmup_epochs": 3,
    "hsv_h"        : 0.015,
    "hsv_s"        : 0.7,
    "hsv_v"        : 0.4,
    "degrees"      : 10.0,
    "translate"    : 0.1,
    "scale"        : 0.5,
    "shear"        : 2.0,
    "flipud"       : 0.3,
    "fliplr"       : 0.5,
    "mosaic"       : 1.0,
    "mixup"        : 0.15,
    "copy_paste"   : 0.1,
    "box"          : 7.5,
    "cls"          : 0.5,
    "dfl"          : 1.5,
    "save_period"  : 5,
    "patience"     : 30,
    "device"       : "0" if torch.cuda.is_available() else "cpu",
    "amp"          : True,
    "seed"         : 42,
}

print("✓ Configuration ready")
print(f"  Model      : {CONFIG['model']}")
print(f"  Epochs     : {CONFIG['epochs']}")
print(f"  Batch      : {CONFIG['batch']}")
print(f"  Device     : {CONFIG['device']}")
print(f"  Output dir : {CONFIG['project_dir']}")

# ─────────────────────────────────────────────
# CELL 8 – Checkpoint Callback (every 5 epochs)
# ─────────────────────────────────────────────
from ultralytics import YOLO

def make_checkpoint_callback(interval=5):
    def on_train_epoch_end(trainer):
        epoch = trainer.epoch + 1
        if epoch % interval == 0:
            ckpt_dir = Path(trainer.save_dir) / "epoch_checkpoints"
            ckpt_dir.mkdir(parents=True, exist_ok=True)
            src  = Path(trainer.last)
            dest = ckpt_dir / f"epoch_{epoch:04d}.pt"
            if src.exists():
                shutil.copy2(src, dest)
                print(f"\n[CheckpointCB] ✓ epoch {epoch:04d} saved → {dest}")
    return on_train_epoch_end

print("✓ Checkpoint callback defined")

# ─────────────────────────────────────────────
# CELL 9 – TRAIN 🚀
# ─────────────────────────────────────────────
model = YOLO(CONFIG["model"])
model.add_callback("on_train_epoch_end", make_checkpoint_callback(interval=CONFIG["save_period"]))

results = model.train(
    data          = CONFIG["data_yaml"],
    epochs        = CONFIG["epochs"],
    imgsz         = CONFIG["imgsz"],
    batch         = CONFIG["batch"],
    workers       = CONFIG["workers"],
    optimizer     = CONFIG["optimizer"],
    lr0           = CONFIG["lr0"],
    lrf           = CONFIG["lrf"],
    momentum      = CONFIG["momentum"],
    weight_decay  = CONFIG["weight_decay"],
    warmup_epochs = CONFIG["warmup_epochs"],
    hsv_h         = CONFIG["hsv_h"],
    hsv_s         = CONFIG["hsv_s"],
    hsv_v         = CONFIG["hsv_v"],
    degrees       = CONFIG["degrees"],
    translate     = CONFIG["translate"],
    scale         = CONFIG["scale"],
    shear         = CONFIG["shear"],
    flipud        = CONFIG["flipud"],
    fliplr        = CONFIG["fliplr"],
    mosaic        = CONFIG["mosaic"],
    mixup         = CONFIG["mixup"],
    copy_paste    = CONFIG["copy_paste"],
    box           = CONFIG["box"],
    cls           = CONFIG["cls"],
    dfl           = CONFIG["dfl"],
    save_period   = CONFIG["save_period"],
    patience      = CONFIG["patience"],
    device        = CONFIG["device"],
    amp           = CONFIG["amp"],
    project       = CONFIG["project_dir"],
    name          = CONFIG["run_name"],
    exist_ok      = True,
    plots         = True,
    verbose       = True,
    seed          = CONFIG["seed"],
)

print("\n✓ Training complete!")

# ─────────────────────────────────────────────
# CELL 10 – Final Validation & Metrics
# ─────────────────────────────────────────────
best = Path(CONFIG["project_dir"]) / CONFIG["run_name"] / "weights" / "best.pt"

val_model   = YOLO(str(best))
val_results = val_model.val(
    data   = CONFIG["data_yaml"],
    imgsz  = CONFIG["imgsz"],
    device = CONFIG["device"],
    plots  = True,
)

print("\n" + "═"*40)
print("  FINAL VALIDATION RESULTS")
print("═"*40)
print(f"  mAP@0.50      : {val_results.box.map50:.4f}")
print(f"  mAP@0.50:0.95 : {val_results.box.map:.4f}")
print(f"  Precision     : {val_results.box.mp:.4f}")
print(f"  Recall        : {val_results.box.mr:.4f}")
print(f"\n  Best weights  → {best}")
print(f"  Checkpoints   → {CONFIG['project_dir']}/{CONFIG['run_name']}/epoch_checkpoints/")

# ─────────────────────────────────────────────
# CELL 11 – Quick Inference Test (optional)
# ─────────────────────────────────────────────
import glob
from IPython.display import Image as IPImage, display

TEST_IMAGE = f"{LOCAL_DATASET}/test/images"

model_inf = YOLO(str(best))
preds = model_inf.predict(
    source  = TEST_IMAGE,
    conf    = 0.25,
    imgsz   = CONFIG["imgsz"],
    device  = CONFIG["device"],
    save    = True,
    project = CONFIG["project_dir"],
    name    = "inference",
)

saved = sorted(glob.glob(f"{CONFIG['project_dir']}/inference/*.jpg"))
if saved:
    display(IPImage(saved[0], width=640))

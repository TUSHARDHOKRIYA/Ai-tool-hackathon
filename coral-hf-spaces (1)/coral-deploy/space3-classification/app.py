"""
Space 3 — Coral Classification (ResNet-50 Only + TTA)
Matches your Colab training code exactly
"""

import io, os, base64
import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Coral Classification API — ResNet-50 Only")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Config ─────────────────────────────────────────────────────────
IMG_SIZE    = 224
NUM_CLASSES = 2
CLASSES     = ["bleached_corals", "healthy_corals"]
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

MODEL_PATH  = os.environ.get("MODEL_PATH", "best.pth")

# ── Model builder (EXACT same as your training code) ───────────────
def build_resnet50():
    m = models.resnet50(weights=None)
    in_features = m.fc.in_features
    m.fc = nn.Sequential(
        nn.Linear(in_features, 512),
        nn.BatchNorm1d(512), nn.ReLU(), nn.Dropout(0.4),
        nn.Linear(512, 128),
        nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.3),
        nn.Linear(128, NUM_CLASSES)
    )
    return m.to(DEVICE)

# ── TTA transforms (copied from your training code) ────────────────
MEAN = [0.485, 0.456, 0.406]
STD  = [0.229, 0.224, 0.225]

tta_transforms = [
    transforms.Compose([transforms.Resize((IMG_SIZE, IMG_SIZE)), transforms.ToTensor(), transforms.Normalize(MEAN, STD)]),
    transforms.Compose([transforms.Resize((IMG_SIZE, IMG_SIZE)), transforms.RandomHorizontalFlip(p=1.0), transforms.ToTensor(), transforms.Normalize(MEAN, STD)]),
    transforms.Compose([transforms.Resize((256, 256)), transforms.CenterCrop(IMG_SIZE), transforms.ToTensor(), transforms.Normalize(MEAN, STD)]),
    transforms.Compose([transforms.Resize((IMG_SIZE, IMG_SIZE)), transforms.RandomVerticalFlip(p=1.0), transforms.ToTensor(), transforms.Normalize(MEAN, STD)]),
]

# ── Global model ───────────────────────────────────────────────────
model = None

@app.on_event("startup")
async def load_model():
    global model
    if Path(MODEL_PATH).exists():
        model = build_resnet50()
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
        model.eval()
        print(f"✓ ResNet-50 loaded from {MODEL_PATH} | Device: {DEVICE}")
    else:
        print(f"⚠ Model not found: {MODEL_PATH} — upload best.pth")

# ── Inference with TTA ─────────────────────────────────────────────
def classify_single(pil_image: Image.Image) -> dict:
    if model is None:
        raise RuntimeError("Model not loaded")

    all_probs = []
    for tf in tta_transforms:
        tensor = tf(pil_image).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
        all_probs.append(probs)

    final_probs = np.mean(all_probs, axis=0)
    pred_idx = int(np.argmax(final_probs))
    pred_label = CLASSES[pred_idx]

    return {
        "label"       : pred_label,
        "label_short" : "healthy" if "healthy" in pred_label else "bleached",
        "confidence"  : round(float(final_probs[pred_idx]), 4),
        "probs": {
            "bleached_corals": round(float(final_probs[0]), 4),
            "healthy_corals" : round(float(final_probs[1]), 4),
        }
    }

# ── Request model ──────────────────────────────────────────────────
class CropItem(BaseModel):
    id: int
    crop_b64: str

class ClassifyBatchRequest(BaseModel):
    crops: List[CropItem]

# ── Endpoints ──────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status"       : "ok",
        "model_loaded" : model is not None,
        "device"       : str(DEVICE),
        "classes"      : CLASSES,
    }

@app.post("/classify")
async def classify_batch(req: ClassifyBatchRequest):
    if model is None:
        raise HTTPException(503, "Model not loaded. Upload best.pth")

    results = []
    for item in req.crops:
        try:
            img_bytes = base64.b64decode(item.crop_b64.split(",")[-1])
            pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            result    = classify_single(pil_img)
            results.append({"id": item.id, "success": True, **result})
        except Exception as e:
            results.append({"id": item.id, "success": False, "error": str(e)})

    return JSONResponse({"results": results})
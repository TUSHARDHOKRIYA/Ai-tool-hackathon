"""
Space 1 — Coral Detection API
YOLOv11 → returns bounding boxes + cropped images (base64)
"""

import io, os, base64
import numpy as np
from PIL import Image
import torch
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="Coral Detection API — Space 1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_PATH = os.environ.get("MODEL_PATH", "best.pt")
model = None

@app.on_event("startup")
async def load():
    global model
    if Path(MODEL_PATH).exists():
        model = YOLO(MODEL_PATH)
        model.to("cuda" if torch.cuda.is_available() else "cpu")
        print(f"✓ Detection model loaded | device={'cuda' if torch.cuda.is_available() else 'cpu'}")
    else:
        print(f"⚠ Model not found at {MODEL_PATH} — upload best.pt")

def img_to_b64(pil_img: Image.Image) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode()

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "device": "cuda" if torch.cuda.is_available() else "cpu"
    }

@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    conf: float = 0.25,
    iou:  float = 0.45,
):
    """
    Accepts an image, runs YOLOv11 detection.
    Returns:
      - detections: list of {bbox, confidence, crop_b64}
      - original_image_b64: original image as base64
      - image_size: {width, height}
    """
    if model is None:
        raise HTTPException(503, "Detection model not loaded. Upload best.pt to Space 1 files.")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image.")

    contents = await file.read()
    image    = Image.open(io.BytesIO(contents)).convert("RGB")
    img_np   = np.array(image)
    w, h     = image.size

    results  = model.predict(source=img_np, conf=conf, iou=iou, imgsz=640, verbose=False)[0]

    detections = []
    for i, box in enumerate(results.boxes):
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        # Clamp to image bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        conf_score = float(box.conf[0])
        cls_id     = int(box.cls[0])
        label      = model.names[cls_id]

        # Crop the detected region
        crop = image.crop((x1, y1, x2, y2))

        detections.append({
            "id"        : i,
            "label"     : label,
            "confidence": round(conf_score, 4),
            "bbox"      : {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            "crop_b64"  : img_to_b64(crop),           # ← sent to Space 3
            "crop_size" : {"width": x2-x1, "height": y2-y1},
        })

    return JSONResponse({
        "success"           : True,
        "total_detections"  : len(detections),
        "detections"        : detections,
        "original_image_b64": img_to_b64(image),
        "image_size"        : {"width": w, "height": h},
    })

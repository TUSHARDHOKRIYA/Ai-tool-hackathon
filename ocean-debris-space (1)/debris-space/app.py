"""
Ocean Debris Detection API — Hugging Face Space
YOLOv11 → detects 8 debris classes with class names above bounding boxes
"""

import io, os, base64
import numpy as np
import cv2
from PIL import Image
import torch
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="Ocean Debris Detection API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Config ─────────────────────────────────────────────────────────
MODEL_PATH = os.environ.get("MODEL_PATH", "best.pt")

# Fallback class names if not in model weights
DEFAULT_CLASSES = [
    "plastic_bottle", "plastic_bag", "fishing_net", "rope",
    "foam", "metal_debris", "wood_debris", "other_debris"
]

# One distinct color per class (BGR for cv2)
CLASS_COLORS = [
    (0,   210, 255),   # plastic_bottle  — cyan
    (255, 100, 30 ),   # plastic_bag     — orange
    (60,  220, 60 ),   # fishing_net     — green
    (255, 60,  180),   # rope            — pink
    (120, 80,  255),   # foam            — purple
    (255, 220, 0  ),   # metal_debris    — yellow
    (30,  160, 255),   # wood_debris     — blue
    (180, 180, 180),   # other_debris    — gray
]

model = None

@app.on_event("startup")
async def load_model():
    global model
    if Path(MODEL_PATH).exists():
        model = YOLO(MODEL_PATH)
        model.to("cuda" if torch.cuda.is_available() else "cpu")
        print(f"✓ Model loaded: {MODEL_PATH} | classes: {model.names}")
    else:
        print(f"⚠  Model not found at '{MODEL_PATH}' — upload best_ocean_debris.pt")

def get_color(cls_id: int):
    return CLASS_COLORS[cls_id % len(CLASS_COLORS)]

def img_to_b64(pil_img: Image.Image) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=93)
    return base64.b64encode(buf.getvalue()).decode()

def draw_detections(image: Image.Image, results) -> tuple:
    """
    Draw bounding boxes with class name written ABOVE each box.
    Returns (annotated_b64, detections_list)
    """
    img_np    = np.array(image.convert("RGB"))
    annotated = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    h, w      = annotated.shape[:2]
    detections = []

    for i, box in enumerate(results.boxes):
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        conf_score = float(box.conf[0])
        cls_id     = int(box.cls[0])
        cls_name   = model.names.get(cls_id, DEFAULT_CLASSES[cls_id % len(DEFAULT_CLASSES)])
        color      = get_color(cls_id)

        # ── Box thickness scales with object size ──────────────────
        thickness  = max(2, int(min(x2-x1, y2-y1) * 0.012))

        # ── Draw bounding box ──────────────────────────────────────
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)

        # ── Label text: CLASS_NAME  conf% ─────────────────────────
        label      = f"{cls_name.replace('_', ' ')}  {conf_score*100:.1f}%"
        font       = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.45, min(0.75, (x2 - x1) / 280))
        font_thick = 1

        (tw, th), baseline = cv2.getTextSize(label, font, font_scale, font_thick)

        # Position label ABOVE the box — clamp so it stays inside image
        label_y_bottom = max(y1 - 4, th + baseline + 6)
        label_y_top    = label_y_bottom - th - baseline - 6
        label_x_right  = min(x1 + tw + 8, w)
        label_x_left   = label_x_right - tw - 8

        # Filled pill background for readability
        cv2.rectangle(
            annotated,
            (label_x_left, label_y_top),
            (label_x_right, label_y_bottom),
            color, -1
        )
        # Dark text on colored background
        text_color = (0, 0, 0) if sum(color) > 380 else (255, 255, 255)
        cv2.putText(
            annotated, label,
            (label_x_left + 4, label_y_bottom - baseline - 2),
            font, font_scale, text_color, font_thick, cv2.LINE_AA
        )

        # Small index circle on top-left corner of box
        cx, cy = x1 + 10, y1 + 10
        cv2.circle(annotated, (cx, cy), 9, color, -1)
        cv2.putText(
            annotated, str(i + 1),
            (cx - 4 if i < 9 else cx - 7, cy + 4),
            font, 0.35, text_color, 1, cv2.LINE_AA
        )

        detections.append({
            "id"         : i,
            "class_id"   : cls_id,
            "class_name" : cls_name,
            "confidence" : round(conf_score, 4),
            "bbox"       : {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            "width"      : x2 - x1,
            "height"     : y2 - y1,
        })

    result_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
    result_pil = Image.fromarray(result_rgb)
    return img_to_b64(result_pil), detections


# ── Endpoints ──────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = Path("index.html")
    if html_path.exists():
        return HTMLResponse(html_path.read_text())
    return HTMLResponse("<h1>Ocean Debris Detection API is running.</h1>")

@app.get("/health")
async def health():
    classes = list(model.names.values()) if model else DEFAULT_CLASSES
    return {
        "status"      : "ok",
        "model_loaded": model is not None,
        "device"      : "cuda" if torch.cuda.is_available() else "cpu",
        "num_classes" : len(classes),
        "classes"     : classes,
    }

@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    conf: float      = 0.25,
    iou : float      = 0.45,
):
    """
    Upload an image → run debris detection.
    Returns annotated image (base64) with class names above each bbox.
    """
    if model is None:
        raise HTTPException(503, "Model not loaded. Upload best_ocean_debris.pt to Space files.")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not read image file.")

    img_np  = np.array(image)
    results = model.predict(
        source=img_np, conf=conf, iou=iou, imgsz=640, verbose=False
    )[0]

    annotated_b64, detections = draw_detections(image, results)

    # Per-class summary
    class_summary = {}
    for det in detections:
        cn = det["class_name"]
        class_summary[cn] = class_summary.get(cn, 0) + 1

    w, h = image.size
    return JSONResponse({
        "success"         : True,
        "annotated_image" : f"data:image/jpeg;base64,{annotated_b64}",
        "detections"      : detections,
        "summary": {
            "total_debris"    : len(detections),
            "by_class"        : class_summary,
            "avg_confidence"  : round(
                sum(d["confidence"] for d in detections) / len(detections), 4
            ) if detections else 0.0,
            "image_size"      : {"width": w, "height": h},
            "conf_threshold"  : conf,
            "iou_threshold"   : iou,
        }
    })

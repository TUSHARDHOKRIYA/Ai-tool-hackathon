"""
Space 2 — Coral Pipeline Orchestrator
1. Receives image from your Vercel UI
2. Calls Space 1 (Detection) → gets bboxes + crops
3. Calls Space 3 (Classification) → gets healthy/bleached per crop
4. Draws final annotated image:
     GREEN box = healthy coral
     RED   box = bleached coral
5. Returns final annotated image + full results to UI
"""

import io, os, base64, httpx, asyncio
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Coral Pipeline Orchestrator — Space 2")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # ← your Vercel domain or * for open
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Space URLs (set as HF Space Secrets / env vars) ────────────────
SPACE1_URL = os.environ.get("SPACE1_URL", "https://YOUR-USER-coral-detection.hf.space")
SPACE3_URL = os.environ.get("SPACE3_URL", "https://YOUR-USER-coral-classification.hf.space")

# Detection thresholds
DEFAULT_CONF = float(os.environ.get("DEFAULT_CONF", "0.25"))
DEFAULT_IOU  = float(os.environ.get("DEFAULT_IOU",  "0.45"))

# Box colors  BGR for cv2
COLOR_HEALTHY  = (94,  197, 34)    # green  (BGR)
COLOR_BLEACHED = (68,  68,  239)   # red    (BGR)
COLOR_UNKNOWN  = (36,  191, 251)   # yellow (BGR)

TIMEOUT = httpx.Timeout(120.0)     # classification can take a few seconds

# ── Severity Scoring (v3) ──────────────────────────────────────────
def get_severity(bleach_conf: float, is_bleached: bool):
    """
    Convert ResNet bleach_confidence → health_score (0-100) + bleach stage.
    No retraining needed — the confidence IS the severity (Revision 1 logic).
    """
    if not is_bleached:
        health_conf = 1.0 - bleach_conf
        score = int(55 + health_conf * 45)   # 55-100
        stage = "Healthy"
    elif bleach_conf <= 0.30:
        score = int(85 - bleach_conf * 100)
        stage = "Healthy"
    elif bleach_conf <= 0.54:
        score = int(84 - (bleach_conf - 0.31) * 130)   # 84 → 55
        stage = "Early Thermal Stress"
    elif bleach_conf <= 0.74:
        score = int(54 - (bleach_conf - 0.55) * 120)   # 54 → 30
        stage = "Partial Bleaching"
    elif bleach_conf <= 0.89:
        score = int(29 - (bleach_conf - 0.75) * 130)   # 29 → 10
        stage = "Severe Bleaching"
    else:
        score = max(0, int((1.0 - bleach_conf) * 90))  # 0-9
        stage = "Critical / Mortality Risk"
    return max(0, min(100, score)), stage

# ── Helpers ────────────────────────────────────────────────────────
def pil_to_b64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return base64.b64encode(buf.getvalue()).decode()

def b64_to_pil(b64str: str) -> Image.Image:
    data = b64str.split(",")[-1]       # strip data:image/... prefix if present
    return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")

def draw_final_image(
    original_b64: str,
    detections  : list,
    classifications: dict,   # {det_id: {"label_short": ..., "confidence": ...}}
) -> str:
    """
    Draw bounding boxes on the original image.
    GREEN  = healthy_corals
    RED    = bleached_corals
    Returns base64 JPEG of the annotated image.
    """
    image    = b64_to_pil(original_b64)
    img_np   = np.array(image)
    annotated = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

    for det in detections:
        det_id = det["id"]
        x1 = det["bbox"]["x1"]
        y1 = det["bbox"]["y1"]
        x2 = det["bbox"]["x2"]
        y2 = det["bbox"]["y2"]

        cls_result = classifications.get(det_id)
        if cls_result:
            label_short = cls_result.get("label_short", "unknown")
            conf        = cls_result.get("confidence", 0.0)
            if label_short == "healthy":
                color      = COLOR_HEALTHY
                disp_label = f"Healthy {conf*100:.1f}%"
            elif label_short == "bleached":
                color      = COLOR_BLEACHED
                disp_label = f"Bleached {conf*100:.1f}%"
            else:
                color      = COLOR_UNKNOWN
                disp_label = f"Unknown {conf*100:.1f}%"
        else:
            color      = COLOR_UNKNOWN
            disp_label = f"Coral {det['confidence']*100:.1f}%"

        thickness = max(2, int(min(x2-x1, y2-y1) * 0.015))

        # Draw box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)

        # Label background
        font_scale = max(0.45, min(0.8, (x2-x1) / 300))
        (tw, th), _ = cv2.getTextSize(disp_label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
        label_y = max(y1 - 4, th + 8)
        cv2.rectangle(annotated, (x1, label_y - th - 6), (x1 + tw + 6, label_y + 2), color, -1)
        cv2.putText(
            annotated, disp_label,
            (x1 + 3, label_y - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale, (255, 255, 255), 1, cv2.LINE_AA
        )

        # Small detection number circle
        cx, cy = x1 + 12, y1 + 12
        cv2.circle(annotated, (cx, cy), 11, color, -1)
        cv2.putText(
            annotated, str(det_id + 1),
            (cx - 4 if det_id < 9 else cx - 7, cy + 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA
        )

    # Convert back to PIL → base64
    result_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
    result_pil = Image.fromarray(result_rgb)
    return pil_to_b64(result_pil)

# ── Main pipeline ──────────────────────────────────────────────────
async def run_pipeline(image_bytes: bytes, conf: float, iou: float) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:

        # ── STEP 1: Detection ──────────────────────────────────────
        detect_resp = await client.post(
            f"{SPACE1_URL}/detect",
            files={"file": ("image.jpg", image_bytes, "image/jpeg")},
            params={"conf": conf, "iou": iou},
        )
        if detect_resp.status_code != 200:
            raise HTTPException(502, f"Detection Space error: {detect_resp.text}")

        detect_data  = detect_resp.json()
        detections   = detect_data["detections"]
        original_b64 = detect_data["original_image_b64"]
        image_size   = detect_data["image_size"]

        if not detections:
            return {
                "success"         : True,
                "annotated_image" : f"data:image/jpeg;base64,{original_b64}",
                "detections"      : [],
                "classifications" : [],
                "summary": {
                    "total_corals"   : 0,
                    "healthy_count"  : 0,
                    "bleached_count" : 0,
                    "image_size"     : image_size,
                },
                "message": "No corals detected in this image."
            }

        # ── STEP 2: Classification ─────────────────────────────────
        classify_payload = {
            "crops": [
                {"id": det["id"], "crop_b64": det["crop_b64"]}
                for det in detections
            ]
        }
        cls_resp = await client.post(
            f"{SPACE3_URL}/classify",
            json=classify_payload,
        )
        if cls_resp.status_code != 200:
            raise HTTPException(502, f"Classification Space error: {cls_resp.text}")

        cls_data = cls_resp.json()

        # Map id → classification result
        cls_map = {r["id"]: r for r in cls_data["results"] if r.get("success")}

        # ── STEP 3: Draw final annotated image ─────────────────────
        final_b64 = draw_final_image(original_b64, detections, cls_map)

        # ── STEP 4: Build response ─────────────────────────────────
        combined = []
        healthy_count  = 0
        bleached_count = 0

        for det in detections:
            did = det["id"]
            cls = cls_map.get(did, {})
            label_short = cls.get("label_short", "unknown")

            # ── v3: convert classification confidence → health score ──
            bleach_conf  = cls.get("probs", {}).get("bleached_corals", 0.0)
            is_bleached  = label_short == "bleached"
            h_score, h_stage = get_severity(bleach_conf, is_bleached)

            entry = {
                "id"                 : did,
                "bbox"               : det["bbox"],
                "detection_conf"     : det["confidence"],
                "classification"     : cls.get("label", "unknown"),
                "label_short"        : label_short,
                "classification_conf": cls.get("confidence", 0.0),
                "probs"              : cls.get("probs", {}),
                # v3 additions:
                "health_score"       : h_score,
                "bleach_stage"       : h_stage,
                "bleach_confidence"  : bleach_conf,
            }
            combined.append(entry)
            if label_short == "healthy":
                healthy_count  += 1
            elif label_short == "bleached":
                bleached_count += 1

        # ── v3: compute overall reef-level score ────────────────────
        all_scores = [e["health_score"] for e in combined]
        avg_health_score = round(sum(all_scores) / len(all_scores)) if all_scores else None
        stage_counts = {}
        for e in combined:
            stage_counts[e["bleach_stage"]] = stage_counts.get(e["bleach_stage"], 0) + 1
        dominant_stage = max(stage_counts, key=stage_counts.get) if stage_counts else None

        return {
            "success"         : True,
            "annotated_image" : f"data:image/jpeg;base64,{final_b64}",
            "detections"      : combined,
            "summary": {
                "total_corals"      : len(detections),
                "healthy_count"     : healthy_count,
                "bleached_count"    : bleached_count,
                "unknown_count"     : len(detections) - healthy_count - bleached_count,
                "avg_health_score"  : avg_health_score,     # v3: 0-100
                "dominant_stage"    : dominant_stage,        # v3: bleach stage name
                "image_size"        : image_size,
                "conf_threshold"    : conf,
                "iou_threshold"     : iou,
            }
        }

# ── Endpoints ──────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status"     : "ok",
        "space1_url" : SPACE1_URL,
        "space3_url" : SPACE3_URL,
    }

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    conf: float      = DEFAULT_CONF,
    iou : float      = DEFAULT_IOU,
):
    """
    Main endpoint called by your Vercel UI.

    Returns:
    - annotated_image : base64 JPEG (GREEN=healthy, RED=bleached boxes)
    - detections      : list with bbox + classification per coral
    - summary         : counts of healthy / bleached / total
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image.")

    image_bytes = await file.read()

    try:
        result = await run_pipeline(image_bytes, conf=conf, iou=iou)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Pipeline error: {str(e)}")

    return JSONResponse(result)

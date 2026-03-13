---

title: OceanScan - Marine Debris Detection
emoji: 🌊
colorFrom: blue
colorTo: indigo
sdk: docker
app_file: app.py
pinned: false
license: mit

---

# 🌊 OceanScan — Marine Debris Detection (YOLOv11)

Detects and classifies 8 types of ocean debris with class names displayed above each bounding box.

## Setup
Upload your model as **`best.pt`** to the root of this Space.

## Detected Classes
| Class          | Description                  |
|----------------|------------------------------|
| plastic_bottle | Plastic bottles/containers   |
| plastic_bag    | Plastic bags/wrapping        |
| fishing_net    | Discarded fishing nets       |
| rope           | Ropes and cables             |
| foam           | Styrofoam/foam pieces        |
| metal_debris   | Metal cans/pipes/scrap       |
| wood_debris    | Wood planks/pallets          |
| other_debris   | Unclassified debris          |

## Live Demo
Just open the Space — the beautiful frontend loads automatically.

## API
`POST /detect` (your Vercel can call this too)
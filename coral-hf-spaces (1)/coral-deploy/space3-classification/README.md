---
title: Coral Classification — ResNet-50 (Space 3)
emoji: 🧬
colorFrom: blue
colorTo: green
sdk: docker
app_file: app.py
pinned: false
---

# Space 3 — Coral Classification (ResNet-50 Only + TTA)

Receives cropped coral images from Space 2 → classifies **healthy** or **bleached**.

## Setup
1. Upload your model as **`best.pth`** to the root
2. Set Hardware → **T4 GPU** (free)
3. No secrets needed

## Endpoint (called by Space 2)
`POST /classify`

Your Vercel pipeline will work automatically after this.
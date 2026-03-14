# Reef Intelligence Platform

## Overview
This repository contains the code for the Reef Intelligence Platform, an AI-powered tool for coral health monitoring and ocean debris detection.

## Project Structure
- **Frontend Application**: Located in `coralwatch-ai-ocean-guardians-main/coralwatch-ai-ocean-guardians-main/`
- **AI Models & Scripts**: Located in `Ai-tool-hackathon-main/Ai-tool-hackathon-main/`

## Setup and Execution Instructions

### 1. Frontend Web Application
The frontend is a modern web application built with React, Vite, TypeScript, Tailwind CSS, and shadcn-ui.

**Prerequisites:**
- Node.js & npm installed

**Execution Steps:**
1. Open a terminal and navigate to the frontend directory:
   ```bash
   cd coralwatch-ai-ocean-guardians-main/coralwatch-ai-ocean-guardians-main
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and navigate to the provided local URL (typically `http://localhost:8080/` or `http://localhost:5173/`).

### 2. AI Models & Analysis Scripts
The AI model scripts for coral health and ocean debris detection are written in Python.

**Prerequisites:**
- Python 3.8+ installed
- Conda or standard Python virtual environment (recommended)

**Execution Steps:**
1. Open a terminal and navigate to the models directory:
   ```bash
   cd "Ai-tool-hackathon-main/Ai-tool-hackathon-main"
   ```
2. Install necessary Python packages (PyTorch, Ultralytics, etc.):
   ```bash
   pip install torch torchvision ultralytics opencv-python onnx matplotlib
   ```
3. You can execute the individual model files based on your needs:
   ```bash
   # For running the YOLO model processing:
   python Yolo-model.py

   # For running the ResNet model processing:
   python resnet.py

   # For training the Ocean Debris model:
   python train_ocean_debris.py
   ```

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

## Documentation & Code Structure

- **Self-Documenting Code**: React components and Python scripts prioritize readable variable names and modular design.
- **Component Level Comments**: Complex logic inside React components (e.g., hooks and data processing) are commented inline to clarify behavior.
- **Python Model Comments**: Model initialization, image preprocessing, and prediction generation steps in `Yolo-model.py` and `resnet.py` include line-by-line comments detailing tensor transformations and thresholding logic. 

## Attributions & Acknowledgments

This project relies on several excellent third-party libraries, datasets, and APIs:

### Frontend Libraries & Frameworks
- **[React](https://reactjs.org/) & [Vite](https://vitejs.dev/)**: For the core UI framework and fast development server.
- **[Tailwind CSS](https://tailwindcss.com/)**: For rapid, utility-first UI styling.
- **[shadcn/ui](https://ui.shadcn.com/)**: For accessible, high-quality Radix UI components.
- **[React Leaflet](https://react-leaflet.js.org/)**: For rendering interactive maps on the dashboard.
- **[Recharts](https://recharts.org/)**: For charting coral health and debris data.

### Backend Services & APIs
- **[Supabase](https://supabase.com/)**: For PostgreSQL database hosting and real-time data syncing.
- **[Cloudinary](https://cloudinary.com/)**: For robust cloud storage and delivery of uploaded marine images.
- **[Hugging Face Spaces](https://huggingface.co/spaces)**: For hosting and serving inference endpoints for the YOLO/ResNet machine learning models.

### AI Models & Datasets
- **[Ultralytics (YOLOv8)](https://github.com/ultralytics/ultralytics)**: The core deep learning architecture used for detecting specific ocean debris objects in imagery.
- **[PyTorch](https://pytorch.org/)**: The underlying tensor library and framework used for developing the ResNet model for coral bleaching classification.
- **Marine Datasets**: The models were trained and evaluated on publicly available marine debris and coral reef imagery datasets (custom compiled specifically for this platform).

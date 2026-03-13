FROM python:3.11-slim

# Fixed system libraries for OpenCV + YOLO
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# HF cache + PyTorch CUDA pre-install (critical for speed & success)
ENV TORCH_HOME=/tmp/torch \
    XDG_CACHE_HOME=/tmp \
    HF_HOME=/tmp/hf_cache
RUN mkdir -p /tmp/torch /tmp/hf_cache && chmod -R 777 /tmp

WORKDIR /app

# Pre-install CUDA torch (prevents conflicts)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root user (HF best practice)
RUN useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
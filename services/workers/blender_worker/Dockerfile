# Use Ubuntu as base and install Blender
FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    python3-pip \
    python3-dev \
    libgl1-mesa-glx \
    libxi6 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and install Blender
RUN wget -O blender.tar.xz https://download.blender.org/release/Blender4.1/blender-4.1.0-linux-x64.tar.xz \
    && tar -xf blender.tar.xz \
    && mv blender-4.1.0-linux-x64 /opt/blender \
    && rm blender.tar.xz

# Add Blender to PATH
ENV PATH="/opt/blender:$PATH"

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for assets and cache
RUN mkdir -p /app/assets /app/cache /app/output

CMD ["celery", "-A", "app.celery_app", "worker", "-Q", "blender", "-l", "info", "--concurrency", "1"]

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install uv for fast, reliable dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency configuration first (for better caching)
COPY pyproject.toml .

# Install ALL dependencies (supports both SMA and AI strategies)
RUN uv pip install --system --no-cache -e .

# Copy all application files
COPY strategies/ ./strategies/
COPY bot_runner.py .

# Default: run SMA strategy (override with STRATEGIES env var)
# ENV STRATEGIES=sma

# Run the unified bot runner
CMD ["python", "-u", "bot_runner.py"]

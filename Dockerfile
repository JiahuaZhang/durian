FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install uv for fast, reliable dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency configuration first (for better caching)
COPY pyproject.toml .

# Install dependencies using uv
RUN uv pip install --system --no-cache alpaca-py python-dotenv

# Copy application files
COPY bot.py .
COPY strategy.py .

# Run the bot
CMD ["python", "-u", "bot.py"]

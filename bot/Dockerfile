FROM python:3.12-slim

WORKDIR /app

# Принудительный сброс кэша Docker слоев
RUN echo "clear_cache_v1"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "bot.py"]


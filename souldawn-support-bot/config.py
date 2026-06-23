"""SOULDAWN Support Bot — Configuration."""
from __future__ import annotations
import os

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "8080"))

# Безопасная обработка списка ID
raw_ids = os.getenv("SUPPORT_CHAT_ID", "520904288,1195137911,8340654471,8735560311")
SUPPORT_CHAT_IDS = [int(i.strip()) for i in raw_ids.split(",") if i.strip()]

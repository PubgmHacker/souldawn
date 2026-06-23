"""SOULDAWN Support Bot — Configuration."""
from __future__ import annotations
import os

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBHOOK_PORT = int(os.getenv("WEBHOOK_PORT", "8080"))

# Настройки базы данных и администраторов
DATABASE_URL = os.getenv("DATABASE_URL", "")
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip().isdigit()]

# Безопасная обработка списка ID поддержки
raw_ids = os.getenv("SUPPORT_CHAT_ID", "520904288,1195137911,8340654471,8735560311")
SUPPORT_CHAT_IDS = [int(i.strip()) for i in raw_ids.split(",") if i.strip()]

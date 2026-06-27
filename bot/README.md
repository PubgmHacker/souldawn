# ⚡ SOULDAWN Bot

Telegram-бот техподдержки для streetwear-бренда SOULDAWN.

## ⚡ Возможности

- 🛍 **Мини-аппа каталог** — открывается прямо в Telegram
- 📋 **FAQ** — 6 категорий: доставка, возврат, размеры, оплата, качество, контакты
- 💬 **Пересылка оператору** — пользователь пишет вопрос → он уходит оператору
- 📦 **Заказы** — оформление заказов через мини-аппу
- 🎛 **Inline-кнопки** — удобная навигация без ввода команд
- 📱 **Меню команд** — встроено в Telegram

## 🚀 Запуск

### 1. Создай бота в Telegram

1. Найди **@BotFather** в Telegram
2. Напиши `/newbot`
3. Задай имя: `SOULDAWN Bot`
4. Задай username: `souldawn_support_bot`
5. Скопируй **API-токен**

### 2. Узнай ID оператора

1. Найди **@userinfobot** в Telegram
2. Напиши любое сообщение
3. Скопируй свой **User ID**

### 3. Настрой переменные окружения

```bash
export BOT_TOKEN="ТВОЙ_ТОКЕН"
export SUPPORT_CHAT_ID="123456789"          # ID оператора
export MINIAPP_URL="https://pubgmhacker.github.io/souldawn-support-bot/miniapp/"
export OPENAI_API_KEY=""                     # Опционально — для AI-ассистента
export DATABASE_URL=""                       # Опционально — PostgreSQL
export YOOKASSA_SHOP_ID=""                   # Опционально — для оплаты
export YOOKASSA_SECRET_KEY=""                # Опционально — для оплаты
```

### 4. Установи и запусти

```bash
cd ~/souldawn-support-bot

# Создай виртуальное окружение
python3 -m venv venv
source venv/bin/activate

# Установи зависимости
pip install -r requirements.txt

# Запусти бота
python bot.py
```

## 📁 Структура

```
souldawn-support-bot/
├── bot.py              # Основной код бота (aiogram 3.x + aiohttp API)
├── miniapp/
│   └── index.html      # Мини-аппа каталог (Telegram WebApp)
├── requirements.txt    # Python зависимости
├── .github/            # GitHub Actions / Pages
├── index.html          # Лендинг для GitHub Pages
└── README.md           # Документация
```

## 🎨 Кастомизация

### Изменить FAQ

В `bot.py` найди словарь `FAQ` — редактируй текст ответов:

```python
FAQ = {
    "delivery": {
        "text": "Твой текст..."
    },
    ...
}
```

### Добавить категорию FAQ

1. Добавь ключ в словарь `FAQ`
2. Добавь кнопку в `main_kb()`

### Деплой мини-аппы

1. Положи `miniapp/index.html` в GitHub Pages
2. Вставь URL в `MINIAPP_URL` в `bot.py`

## 📋 Команды

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню |
| `/help` | Справка |
| `/order` | Статус заказа |

## ⚠️ Замечания

- Бот работает на **aiogram 3.x** (Python 3.10+)
- Для продакшена замени `MemoryStorage` на `RedisStorage`
- Мини-аппа: один HTML файл, без фреймворков

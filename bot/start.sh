#!/bin/bash
# SOULDAWN — Railway start script
# Runs DB check first, then starts the bot
echo "=== SOULDAWN START SCRIPT ==="
echo "Step 1: Running DB check..."
python check_db.py
DB_EXIT=$?
if [ $DB_EXIT -ne 0 ]; then
    echo "!!! DB CHECK FAILED (exit code $DB_EXIT) — starting bot anyway for debugging... !!!"
fi
echo "Step 2: Starting bot..."
exec python bot.py

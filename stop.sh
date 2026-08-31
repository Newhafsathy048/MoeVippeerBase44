#!/bin/sh
if [ -f bot.pid ]; then
    echo "🛑 Stopping MoE Bot (PID: $(cat bot.pid))..."
    kill $(cat bot.pid) 2>/dev/null
    rm bot.pid
    echo "✅ Bot stopped"
else
    echo "❌ Bot is not running"
fi

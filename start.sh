#!/bin/sh
echo "🚀 Starting MoE Bot..."
nohup node src/index.js > bot.log 2>&1 &
echo $! > bot.pid
echo "✅ Bot started (PID: $(cat bot.pid))"
echo "📊 Dashboard: http://localhost:3000"
echo "📋 Logs: tail -f bot.log"

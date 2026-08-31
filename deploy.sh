#!/bin/bash
set -e

echo "🚀 MoE Bot Deployment Script"
echo "============================"

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Installing..."
    curl -L https://fly.io/install.sh | sh
    export FLYCTL_INSTALL="$HOME/.fly"
    export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi

# Check login
if ! fly auth whoami &> /dev/null; then
    echo "🔐 Please login to Fly.io..."
    fly auth login
fi

# Get app name from fly.toml or prompt
APP_NAME=$(grep -E '^app\s*=' fly.toml | sed 's/app = "//;s/"$//' | head -1)
if [ -z "$APP_NAME" ]; then
    read -p "Enter Fly.io app name (e.g., moe-bot): " APP_NAME
    sed -i "s/^app = .*/app = "$APP_NAME"/" fly.toml
fi

echo "📦 App: $APP_NAME"

# Check if volume exists
if ! fly volumes list --app "$APP_NAME" 2>/dev/null | grep -q "bot_data"; then
    echo "💾 Creating persistent volume for auth data..."
    fly volumes create bot_data --size 1 --region jnb --app "$APP_NAME" --yes
else
    echo "💾 Volume already exists"
fi

# Set secrets from .env if it exists
if [ -f .env ]; then
    echo "🔒 Setting secrets from .env..."
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        # Remove quotes from value
        value=$(echo "$value" | sed 's/^["'"'"']//;s/["'"'"']$//')
        echo "  → $key"
        fly secrets set "$key=$value" --app "$APP_NAME" &> /dev/null
    done < .env
fi

# Deploy
echo "🚀 Deploying to Fly.io..."
fly deploy --app "$APP_NAME"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Dashboard URL:"
fly status --app "$APP_NAME" | grep "Hostname" || fly open --app "$APP_NAME"
echo ""
echo "📋 View logs: fly logs --app $APP_NAME"
echo "🔄 Restart: fly restart --app $APP_NAME"

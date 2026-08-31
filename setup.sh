#!/bin/bash
set -e

echo "⚙️  MoE Bot First-Time Setup"
echo "==========================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Found: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  PLEASE EDIT .env WITH YOUR SETTINGS:"
    echo "   nano .env"
    echo ""
    echo "   Required:"
    echo "   - OWNER_NUMBER=12136061765"
    echo "   - OWNER_NAME=Moe Hafsathy"
    echo "   - OWNER_EMAIL=nahsathy@gmail.com"
    echo ""
    echo "   Optional (for AI commands):"
    echo "   - OPENAI_API_KEY=sk-your-key"
    echo ""
fi

# Check assets
if [ ! -f "public/assets/moe-profile.jpg" ]; then
    echo ""
    echo "⚠️  WARNING: public/assets/moe-profile.jpg not found!"
    echo "   Add your bot profile image to public/assets/"
fi

if [ ! -f "public/assets/menu-audio.m4a" ]; then
    echo ""
    echo "⚠️  WARNING: public/assets/menu-audio.m4a not found!"
    echo "   Add your menu audio to public/assets/"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your settings"
echo "  2. Add assets to public/assets/"
echo "  3. Run locally: npm start"
echo "  4. Deploy: ./deploy.sh"

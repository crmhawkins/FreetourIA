#!/bin/bash
set -e

echo "🚀 FreeTour IA - Setup"
echo "======================"

# Check if .env exists for backend
if [ ! -f "apps/backend/.env" ]; then
    echo "📝 Creating backend .env from example..."
    cp apps/backend/.env.example apps/backend/.env
    echo "⚠️  Please edit apps/backend/.env with your API keys before starting"
fi

# Check if .env exists for mobile
if [ ! -f "apps/mobile/.env" ]; then
    echo "📝 Creating mobile .env from example..."
    cp apps/mobile/.env.example apps/mobile/.env
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start database
echo "🐘 Starting PostgreSQL..."
docker-compose up -d postgres

echo "⏳ Waiting for database..."
sleep 5

# Run migrations
echo "🗄️  Running database migrations..."
cd apps/backend
npx prisma migrate dev --name init || npx prisma db push
npx prisma db seed
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  cd apps/backend && npm run start:dev"
echo "  Mobile:   cd apps/mobile && npm start"
echo ""
echo "Demo login: demo@freetour.ai / Demo1234"

#!/bin/bash
# setup.sh - Setup script for Arm Academy

set -e

echo "🚀 Setting up Arm Academy..."

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Setup environment file
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your settings"
fi

# Run migrations
echo "🗄️  Running migrations..."
python manage.py migrate

# Create superuser
echo "👤 Creating superuser..."
python manage.py createsuperuser

# Collect static files
echo "📦 Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "✨ Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  python manage.py runserver"
echo ""
echo "Admin panel: http://localhost:8000/admin"
echo "API: http://localhost:8000/api/"

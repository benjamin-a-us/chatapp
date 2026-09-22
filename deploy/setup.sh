#!/bin/bash
# Deployment script for Chat House on DigitalOcean Ubuntu 24.04
# Usage: ./setup.sh

set -e

echo "🚀 Chat House Deployment Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Variables
APP_DIR="/var/www/chat"
APP_USER="www-data"
DOMAIN="${1:-localhost}"

echo -e "${YELLOW}Domain: $DOMAIN${NC}"

# Step 1: Update system
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt update && apt upgrade -y

# Step 2: Install dependencies
echo -e "${YELLOW}[2/8] Installing PHP, Node.js, and web server...${NC}"
apt install -y \
    php8.3 \
    php8.3-cli \
    php8.3-fpm \
    php8.3-mysql \
    php8.3-sqlite3 \
    php8.3-mbstring \
    php8.3-xml \
    php8.3-curl \
    php8.3-zip \
    php8.3-bcmath \
    composer \
    nodejs \
    npm \
    nginx \
    git \
    curl \
    supervisor \
    certbot \
    python3-certbot-nginx

# Step 3: Clone repository (if not already present)
if [ ! -d "$APP_DIR" ]; then
    echo -e "${YELLOW}[3/8] Cloning repository...${NC}"
    git clone https://github.com/YOUR_USERNAME/chat.git $APP_DIR
    cd $APP_DIR
else
    echo -e "${YELLOW}[3/8] Repository already exists, pulling latest...${NC}"
    cd $APP_DIR
    git pull origin main
fi

# Step 4: Install dependencies
echo -e "${YELLOW}[4/8] Installing PHP and Node dependencies...${NC}"
cd $APP_DIR/backend
composer install --no-dev --optimize-autoloader
npm install --omit=dev
npm run build

cd $APP_DIR
npm install --omit=dev
npm run build

# Step 5: Create .env file
echo -e "${YELLOW}[5/8] Creating production .env file...${NC}"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp $APP_DIR/backend/.env.example $APP_DIR/backend/.env
    php $APP_DIR/backend/artisan key:generate
    
    # Update .env with production settings
    sed -i "s/APP_DEBUG=true/APP_DEBUG=false/" $APP_DIR/backend/.env
    sed -i "s/APP_ENV=local/APP_ENV=production/" $APP_DIR/backend/.env
    sed -i "s|APP_URL=http://localhost:8000|APP_URL=https://$DOMAIN|" $APP_DIR/backend/.env
    sed -i "s/BROADCAST_CONNECTION=reverb/BROADCAST_CONNECTION=reverb/" $APP_DIR/backend/.env
    
    echo -e "${GREEN}Created .env file. Please update with your settings:${NC}"
    echo "  - DB_CONNECTION, DB_HOST, DB_USERNAME, DB_PASSWORD"
    echo "  - MAIL_* settings for email"
    echo "  - SESSION_DOMAIN=$DOMAIN"
fi

# Step 6: Set permissions
echo -e "${YELLOW}[6/8] Setting file permissions...${NC}"
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR
chmod -R 775 $APP_DIR/backend/storage
chmod -R 775 $APP_DIR/backend/bootstrap/cache

# Step 7: Run migrations
echo -e "${YELLOW}[7/8] Running database migrations...${NC}"
cd $APP_DIR/backend
php artisan migrate --force
php artisan cache:clear

# Step 8: Configure Nginx
echo -e "${YELLOW}[8/8] Configuring Nginx...${NC}"
cp /var/www/chat/deploy/nginx.conf /etc/nginx/sites-available/chat
# Note: nginx.conf already has spider9622eng-chat.com hardcoded

# Enable site
ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/chat
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx

# Configure PHP-FPM
cp /var/www/chat/deploy/php-fpm.conf /etc/php/8.3/fpm/pool.d/chat.conf
systemctl reload php8.3-fpm

# Configure Supervisor for background jobs
cp /var/www/chat/deploy/supervisor-laravel.conf /etc/supervisor/conf.d/laravel.conf
cp /var/www/chat/deploy/supervisor-reverb.conf /etc/supervisor/conf.d/reverb.conf
supervisorctl reread && supervisorctl update

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deployment setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Point your DNS to this Droplet IP"
echo "2. Update /var/www/chat/backend/.env with database and mail settings"
echo "3. Run: supervisorctl restart all"
echo "4. Setup SSL: certbot --nginx -d spider9622eng-chat.com"
echo "5. Visit: https://spider9622eng-chat.com"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  supervisorctl restart all          # Restart all services"
echo "  php artisan migrate --force         # Run migrations"
echo "  php artisan tinker                 # Laravel REPL"
echo "  tail -f /var/log/supervisor/*      # View logs"

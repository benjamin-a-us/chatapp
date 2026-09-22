# 🚀 Chat House - Deployment Guide

Complete step-by-step guide to deploy Chat House on DigitalOcean with production-ready setup.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [DigitalOcean Setup](#digitalocean-setup)
3. [Automated Deployment](#automated-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Post-Deployment Setup](#post-deployment-setup)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Local Machine
- Git installed and configured
- GitHub account with your chat repo
- SSH key pair for server access

### What You'll Need
- Domain name (optional, can use IP)
- DigitalOcean account (~$5-6/month to start)
- Email account for notifications (Gmail, SendGrid, etc)

---

## DigitalOcean Setup

### Step 1: Create DigitalOcean Account

1. Go to https://www.digitalocean.com
2. Sign up with email
3. Create a project or use default
4. Add payment method

### Step 2: Create SSH Key (Local Machine)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Save to: ~/.ssh/id_ed25519
# Press Enter for no passphrase (or set one)

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub
```

### Step 3: Add SSH Key to DigitalOcean

1. In DigitalOcean Dashboard → Settings → Security
2. Click "Add SSH Key"
3. Paste your public key
4. Name it: "chat-house-deployment"

### Step 4: Create Droplet

1. DigitalOcean Dashboard → Create → Droplets
2. **Image**: Ubuntu 24.04 LTS x64
3. **Size**: Basic - $5/month (1GB RAM, 25GB SSD)
   - Start here, upgrade to $12/month (2GB) if needed
4. **Region**: Choose closest to users (e.g., New York, London, Singapore)
5. **Authentication**: Select SSH key you just added
6. **Hostname**: `chat-house`
7. Click "Create Droplet"

**Save the Droplet IP address** - you'll need it shortly.

---

## Automated Deployment

### Quickest Method (Recommended)

#### 1. Prepare Your GitHub Repository

```bash
cd d:\WorkSpace\chat

# Initialize git if not done
git init
git add .
git commit -m "Initial commit: Chat House app"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/YOUR_USERNAME/chat.git
git branch -M main
git push -u origin main
```

#### 2. SSH into Droplet

```bash
# On your local machine
ssh root@YOUR_DROPLET_IP

# First time might ask to add to known hosts - type 'yes'
```

#### 3. Clone and Run Setup Script

```bash
# On the Droplet
cd /tmp
git clone https://github.com/YOUR_USERNAME/chat.git
cd chat

# Make script executable
chmod +x deploy/setup.sh

# Run deployment with your domain
./deploy/setup.sh yourdomain.com

# Or just IP if no domain yet
./deploy/setup.sh 123.45.67.89
```

The script will:
- ✅ Install all dependencies
- ✅ Configure PHP, Node, Nginx
- ✅ Set up Laravel with database
- ✅ Build React frontend
- ✅ Configure Supervisor for background tasks

#### 4. Update Environment Configuration

```bash
# Edit the production environment file
nano /var/www/chat/backend/.env

# Update these critical values:
# - APP_KEY: (already generated)
# - DB_CONNECTION: mysql (if using MySQL)
# - DB_HOST, DB_USERNAME, DB_PASSWORD
# - MAIL_DRIVER, MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD
# - REVERB_APP_KEY, REVERB_APP_SECRET

# Save: Ctrl+O, Enter, Ctrl+X
```

#### 5. Setup SSL Certificate

```bash
# On the Droplet
certbot --nginx -d yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms (A)
# - Redirect HTTP to HTTPS (2)

# Test renewal
certbot renew --dry-run
```

#### 6. Start Services

```bash
# Restart all services
supervisorctl restart all

# Verify services running
supervisorctl status

# You should see:
# chat-laravel-worker:chat-laravel-worker_00   RUNNING
# chat-laravel-worker:chat-laravel-worker_01   RUNNING
# chat-reverb:chat-reverb                      RUNNING
```

#### 7. Access Your App

Visit:
- `https://yourdomain.com` (with SSL)
- `http://YOUR_DROPLET_IP:80` (without domain)

---

## Manual Deployment

If you prefer more control, follow these steps:

### 1. SSH into Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Dependencies

```bash
apt install -y \
    php8.3 php8.3-cli php8.3-fpm \
    php8.3-mysql php8.3-sqlite3 \
    php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath \
    composer nodejs npm \
    nginx git curl supervisor \
    certbot python3-certbot-nginx \
    redis-server mysql-server  # Optional: for production databases
```

### 4. Clone Repository

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/YOUR_USERNAME/chat.git
cd chat
```

### 5. Install Backend Dependencies

```bash
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate

# Update .env with your settings
nano .env
```

### 6. Build Frontend

```bash
cd /var/www/chat
npm install --omit=dev
npm run build
```

### 7. Copy Built Frontend to Backend

```bash
# The frontend build needs to be served by Laravel
cp -r dist/* backend/public/
```

### 8. Set Permissions

```bash
chown -R www-data:www-data /var/www/chat
chmod -R 755 /var/www/chat
chmod -R 775 /var/www/chat/backend/storage /var/www/chat/backend/bootstrap/cache
```

### 9. Configure PHP-FPM

```bash
cp /var/www/chat/deploy/php-fpm.conf /etc/php/8.3/fpm/pool.d/chat.conf
systemctl reload php8.3-fpm
```

### 10. Configure Nginx

```bash
cp /var/www/chat/deploy/nginx.conf /etc/nginx/sites-available/chat
sed -i "s/YOUR_DOMAIN/yourdomain.com/" /etc/nginx/sites-available/chat

# Enable site
ln -sf /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/chat
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx
```

### 11. Configure Supervisor

```bash
cp /var/www/chat/deploy/supervisor-laravel.conf /etc/supervisor/conf.d/laravel.conf
cp /var/www/chat/deploy/supervisor-reverb.conf /etc/supervisor/conf.d/reverb.conf

supervisorctl reread
supervisorctl update
supervisorctl start all
```

### 12. Run Migrations

```bash
cd /var/www/chat/backend
php artisan migrate --force
php artisan cache:clear
```

### 13. Setup SSL

```bash
certbot --nginx -d yourdomain.com
```

---

## Post-Deployment Setup

### 1. Configure Email Service

For 2FA codes and password resets to work, configure email:

**Option A: Mailtrap (Recommended for Testing)**
1. Sign up at https://mailtrap.io
2. Create an inbox
3. Get SMTP credentials
4. Update `/var/www/chat/backend/.env`:
   ```
   MAIL_DRIVER=smtp
   MAIL_HOST=smtp.mailtrap.io
   MAIL_PORT=465
   MAIL_USERNAME=your_username
   MAIL_PASSWORD=your_password
   MAIL_ENCRYPTION=tls
   ```

**Option B: SendGrid (Production)**
1. Sign up at https://sendgrid.com
2. Create API key
3. Update .env:
   ```
   MAIL_DRIVER=smtp
   MAIL_HOST=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USERNAME=apikey
   MAIL_PASSWORD=your_api_key
   ```

**Option C: Gmail (Development Only)**
1. Enable 2FA on Gmail
2. Generate App Password
3. Update .env:
   ```
   MAIL_DRIVER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your.email@gmail.com
   MAIL_PASSWORD=your_app_password
   ```

### 2. Configure Database (Optional Upgrade)

For better performance, use MySQL instead of SQLite:

```bash
# On Droplet
mysql -u root -p

# In MySQL shell
CREATE DATABASE chat_house;
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON chat_house.* TO 'chat_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Update `/var/www/chat/backend/.env`:
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chat_house
DB_USERNAME=chat_user
DB_PASSWORD=secure_password
```

Run migrations:
```bash
php artisan migrate --force
```

### 3. Setup Monitoring (Optional)

**Sentry for Error Tracking:**
```bash
composer require sentry/sentry-laravel

# Follow setup instructions at https://sentry.io
```

**Database Backups:**
```bash
# Daily backup to DigitalOcean Spaces
0 2 * * * cd /var/www/chat/backend && php artisan backup:run >> /var/log/backups.log 2>&1
```

---

## Troubleshooting

### App Not Loading

**Check Nginx:**
```bash
nginx -t
tail -f /var/log/nginx/error.log
```

**Check PHP-FPM:**
```bash
systemctl status php8.3-fpm
tail -f /var/log/php-fpm/chat-error.log
```

### WebSocket Not Connecting

**Check Reverb:**
```bash
supervisorctl status chat-reverb
tail -f /var/log/supervisor/chat-reverb.log

# Test connection
curl http://127.0.0.1:8080/health
```

### Database Connection Error

```bash
# Check MySQL running
systemctl status mysql

# Test connection
mysql -u chat_user -p chat_house -e "SELECT 1;"

# Reset password if needed
mysql -u root -p
ALTER USER 'chat_user'@'localhost' IDENTIFIED BY 'new_password';
```

### 2FA Emails Not Sending

```bash
# Test mail config
php artisan tinker
>>> Mail::raw('Test', fn ($msg) => $msg->to('test@example.com'));

# Check logs
tail -f /var/www/chat/backend/storage/logs/laravel.log
```

### Running Out of Memory

```bash
# Check memory usage
free -h

# Increase swap (temporary)
dd if=/dev/zero of=/swapfile bs=1G count=2
mkswap /swapfile && swapon /swapfile

# Or upgrade Droplet (permanent)
# DigitalOcean Console → Resize
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check disk space: `df -h`

**Weekly:**
- Review supervisor logs
- Test backup process
- Check SSL certificate: `certbot certificates`

**Monthly:**
- Update dependencies: `composer update`, `npm update`
- Clean old logs: `find /var/log -type f -mtime +30 -delete`
- Review failed logins: `grep "failed_login" storage/logs/laravel.log`

**Every 3 Months:**
- Update system: `apt update && apt upgrade`
- Test disaster recovery
- Review security settings

### Useful Commands

```bash
# View all logs
tail -f /var/www/chat/backend/storage/logs/laravel.log

# Database operations
php artisan tinker
php artisan migrate --fresh --seed

# Clear all caches
php artisan cache:clear config:clear view:clear

# Run artisan commands
php artisan queue:work          # Run jobs manually
php artisan horizon             # Job queue dashboard

# Restart services
supervisorctl restart all
systemctl reload nginx

# Check disk usage
du -sh /var/www/chat/backend/storage/*

# Monitor real-time logs
watch -n 1 'supervisorctl status'
```

### Upgrading

**To Upgrade Droplet Size:**
1. DigitalOcean Console → Resize
2. Choose new size
3. Click "Resize"
4. Restart droplet if needed

**To Add SSL Certificate:**
```bash
certbot --nginx -d newdomain.com
```

**To Deploy New Code:**
```bash
cd /var/www/chat
git pull origin main
cd backend && composer install --no-dev
cd .. && npm install --omit=dev && npm run build
cp -r dist/* backend/public/
php artisan migrate --force
supervisorctl restart all
```

---

## Security Checklist

- [ ] SSH key authentication only (no password)
- [ ] Firewall configured (only ports 22, 80, 443)
- [ ] SSL certificate installed and auto-renewing
- [ ] `.env` file not in git repo
- [ ] Database password strong (20+ characters, mixed case/numbers/symbols)
- [ ] Mail credentials stored securely
- [ ] Regular backups enabled
- [ ] Failed login monitoring enabled
- [ ] Rate limiting configured
- [ ] CORS restricted to your domain

---

## Support & Resources

- **Laravel Docs**: https://laravel.com/docs
- **Laravel Reverb**: https://laravel.com/docs/reverb
- **DigitalOcean Tutorials**: https://www.digitalocean.com/community
- **Nginx Guide**: https://nginx.org/en/docs/
- **Ubuntu 24.04 Docs**: https://ubuntu.com/documentation

---

## Estimated Timeline

| Step | Time |
|------|------|
| Create DigitalOcean account | 5 min |
| Create Droplet | 2 min |
| Run setup script | 15 min |
| Configure DNS | 5 min |
| Setup SSL | 5 min |
| **Total** | **~30 min** |

After this, your app is live! 🎉

---

**Questions?** Check logs with: `tail -f /var/www/chat/backend/storage/logs/laravel.log`

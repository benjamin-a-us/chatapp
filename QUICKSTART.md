# 🚀 Quick Start: Deploy Chat House

**Complete deployment in 30 minutes or less.**

---

## 📋 Prerequisites

- ✅ GitHub account with your code pushed
- ✅ DigitalOcean account (free $200 credit with this link: https://m.do.co/c/a3f3c0f0d4b6)
- ✅ Domain name (optional, can use Droplet IP)
- ✅ Email account (Gmail, Mailtrap, SendGrid for 2FA emails)

---

## ⚡ Fastest Path (Automated Setup)

### 1. Create DigitalOcean Droplet (5 min)

```bash
# 1. Go to https://www.digitalocean.com
# 2. Create → Droplet
# 3. Ubuntu 24.04 LTS, $5/month size
# 4. Add your SSH key from Step 2 below
# 5. Click Create
# 6. Copy the Droplet IP address
```

### 2. Setup SSH Key (2 min)

```bash
# On your local machine
ssh-keygen -t ed25519 -C "chat-deploy"
# Press Enter twice, copy public key to DigitalOcean

# Show public key (paste into DigitalOcean)
cat ~/.ssh/id_ed25519.pub
```

### 3. Deploy (5 min)

```bash
# SSH into your Droplet
ssh root@YOUR_DROPLET_IP

# Run the automated setup
cd /tmp
git clone https://github.com/YOUR_USERNAME/chat.git
cd chat && chmod +x deploy/setup.sh
./deploy/setup.sh spider9622eng-chat.com

# Or without domain: ./deploy/setup.sh
```

### 4. Configure Environment (10 min)

```bash
# Update production settings
nano /var/www/chat/backend/.env

# Critical settings to update:
# - APP_URL=https://yourdomain.com
# - DB_CONNECTION=mysql (if using MySQL)
# - MAIL_DRIVER, MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD
# - REVERB_APP_KEY, REVERB_APP_SECRET

# Save: Ctrl+O, Enter, Ctrl+X
```

### 5. SSL Certificate (5 min)

```bash
# Still on Droplet
certbot --nginx -d yourdomain.com
# Follow prompts, choose redirect HTTP to HTTPS

# Verify it auto-renews
certbot renew --dry-run
```

### 6. Start Services (2 min)

```bash
supervisorctl restart all
supervisorctl status
# Should show: chat-laravel-worker and chat-reverb as RUNNING
```

### 7. Verify It Works!

Visit: `https://spider9622eng-chat.com` (or `http://YOUR_DROPLET_IP`)

You should see the login screen. 🎉

---

## 🔄 Enable Auto-Deployment (Optional)

Every time you push to GitHub, it auto-deploys:

### 1. Add GitHub Secrets

Generate SSH key for GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy    # Copy this
```

On Droplet:
```bash
cat >> ~/.ssh/authorized_keys <<EOF
your_github_actions_public_key
EOF
```

### 2. GitHub Repo Settings

1. Settings → Secrets and variables → Actions
2. Add secrets:
   - `DROPLET_IP`: Your Droplet IP
   - `DEPLOY_SSH_KEY`: Private key from Step 1

### 3. Push Code

```bash
git push origin main
```

Watch it deploy automatically in GitHub Actions tab! ✨

---

## 📁 What Gets Deployed

```
/var/www/chat/
├── backend/              (Laravel API)
├── public/               (React frontend - built)
├── deploy/               (Deployment scripts)
├── DEPLOYMENT.md         (Full guide)
├── OPTIMIZATION.md       (Performance tips)
└── CI_CD_SETUP.md        (GitHub Actions guide)
```

---

## 🔧 Services Running

| Service | Purpose | Port |
|---------|---------|------|
| Nginx | Web server | 80, 443 |
| PHP-FPM | Backend processor | Unix socket |
| Laravel Reverb | WebSocket server | 8080 |
| Supervisor | Process monitor | - |

Check all: `supervisorctl status`

---

## 📧 Configure Email (Required for 2FA)

### Option 1: Mailtrap (Easiest for testing)
1. Sign up: https://mailtrap.io
2. Get SMTP credentials
3. Update `.env`:
   ```
   MAIL_DRIVER=smtp
   MAIL_HOST=smtp.mailtrap.io
   MAIL_PORT=465
   MAIL_USERNAME=xxx
   MAIL_PASSWORD=xxx
   MAIL_ENCRYPTION=tls
   APP_URL=https://spider9622eng-chat.com
   CORS_ALLOWED_ORIGINS="https://spider9622eng-chat.com"
   ```

### Option 2: SendGrid (Production)
1. Sign up: https://sendgrid.com
2. Create API key
3. Update `.env`:
   ```
   MAIL_DRIVER=smtp
   MAIL_HOST=smtp.sendgrid.net
   MAIL_PORT=587
   MAIL_USERNAME=apikey
   MAIL_PASSWORD=your_api_key
   ```

Then restart services:
```bash
supervisorctl restart all
```

---

## 🐛 Troubleshooting

### Site not loading?
```bash
# Check Nginx
nginx -t
tail /var/log/nginx/error.log

# Check PHP
systemctl status php8.3-fpm
tail /var/log/php-fpm/chat-error.log
```

### WebSocket not connecting?
```bash
# Check Reverb
supervisorctl status chat-reverb
tail /var/log/supervisor/chat-reverb.log
curl http://127.0.0.1:8080/health
```

### Emails not sending?
```bash
# SSH to Droplet and test
php artisan tinker
Mail::raw('Test', fn($m) => $m->to('your@email.com'));
tail /var/www/chat/backend/storage/logs/laravel.log
```

---

## 📊 Performance Optimizations

See [OPTIMIZATION.md](OPTIMIZATION.md) for detailed improvements:

- **Quick wins** (5 min):
  - Enable OPcache
  - Add database indexes
  - Enable Redis caching

- **Refactoring** (2-4 hours):
  - Split React components
  - Lazy load routes
  - Virtualize message list

Expected improvement: **3-5x faster**

---

## 📚 Full Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete manual deployment guide
- **[OPTIMIZATION.md](OPTIMIZATION.md)** - Performance improvements & refactoring
- **[CI_CD_SETUP.md](CI_CD_SETUP.md)** - GitHub Actions automation
- **[deploy/](deploy/)** - Configuration files (Nginx, PHP-FPM, Supervisor)

---

## 🎯 Next Steps After Deployment

- [ ] Test 2FA email verification
- [ ] Create test user account
- [ ] Test real-time messaging
- [ ] Test file attachments
- [ ] Monitor logs: `tail -f /var/www/chat/backend/storage/logs/laravel.log`
- [ ] Setup backups
- [ ] Add monitoring (Sentry, New Relic)
- [ ] Share domain with friends! 🎉

---

## 💰 Estimated Costs (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Droplet | $5-12 | 1-2GB RAM droplet |
| Domain | ~$10 | .com, .co, etc |
| Email (Mailtrap/SendGrid) | Free-50 | Pay as you grow |
| SSL Certificate | Free | LetsEncrypt auto-renew |
| **Total** | **~$15-25** | Scales with users |

---

## 🆘 Support Resources

- **Laravel Docs**: https://laravel.com/docs
- **DigitalOcean Tutorials**: https://www.digitalocean.com/community
- **Check Logs**: `tail -f /var/www/chat/backend/storage/logs/laravel.log`
- **Supervisor Status**: `supervisorctl status`
- **SSH Troubleshooting**: `ssh -v root@YOUR_IP` (verbose mode)

---

## 🎉 That's It!

Your Chat House is now **live and production-ready**. 

Time to celebrate! 🚀

**Questions?** Check the [full deployment guide](DEPLOYMENT.md) or relevant docs above.

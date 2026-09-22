# 🌐 Domain Setup Guide: spider9622eng-chat.com

Your Chat House project is now configured to use **spider9622eng-chat.com** as its domain address.

---

## ✅ What's Been Configured

| File | Change |
|------|--------|
| `backend/.env.production` | `APP_URL=https://spider9622eng-chat.com` |
| `backend/.env.production` | `CORS_ALLOWED_ORIGINS=https://spider9622eng-chat.com` |
| `deploy/nginx.conf` | SSL certificates configured for domain |
| `deploy/setup.sh` | Domain hardcoded in deployment |

---

## 🔗 Next: Point Your DNS to Your Server

### Step 1: Deploy to DigitalOcean (Get Your Server IP)

```bash
# Create a Droplet on DigitalOcean
# Copy your Droplet IP address (e.g., 123.45.67.89)

# SSH into Droplet
ssh root@YOUR_DROPLET_IP

# Run deployment
cd /tmp
git clone https://github.com/YOUR_USERNAME/chat.git
cd chat && chmod +x deploy/setup.sh
./deploy/setup.sh
```

**Save your Droplet IP address** - you'll need it next.

---

### Step 2: Check Your Domain Registrar

Find where you registered `spider9622eng-chat.com`:
- GoDaddy.com
- Namecheap.com
- Domain.com
- Google Domains
- Cloudflare
- Other registrar?

### Step 3: Update DNS Records

In your registrar's control panel:

1. **Find "DNS Settings"** or **"Nameservers"** or **"DNS Management"**
2. **Add an A Record:**
   ```
   Type:  A
   Name:  @
   Value: YOUR_DROPLET_IP (e.g., 123.45.67.89)
   TTL:   3600 (or default)
   ```

3. **Optional: Add www subdomain**
   ```
   Type:  A
   Name:  www
   Value: YOUR_DROPLET_IP
   TTL:   3600
   ```

4. **Save changes**

### Step 4: Wait for DNS Propagation

- **Immediate**: Usually works in 5-30 minutes
- **Slow**: Can take up to 24 hours
- **Check**: `nslookup spider9622eng-chat.com` or https://mxtoolbox.com

---

## 🔐 SSL Certificate Setup

Once DNS is pointing to your server:

```bash
# SSH into your Droplet
ssh root@YOUR_DROPLET_IP

# Create SSL certificate (automatic)
certbot --nginx -d spider9622eng-chat.com

# Follow prompts:
# 1. Enter your email
# 2. Agree to terms (A)
# 3. Redirect HTTP to HTTPS (2)

# Verify auto-renewal
certbot renew --dry-run
```

---

## 🧪 Test Your Domain

### 1. Check DNS Resolution
```bash
# On your local machine
nslookup spider9622eng-chat.com
# Should show your Droplet IP
```

### 2. Visit Your App
```
https://spider9622eng-chat.com
```

### 3. Test API Endpoints
```bash
curl https://spider9622eng-chat.com/api/user
# Should return API response or login redirect
```

### 4. Test WebSocket Connection
```
Open browser console and check:
- No CORS errors
- WebSocket connects to wss://spider9622eng-chat.com
```

---

## 📋 DNS Setup Checklist

- [ ] Domain registered (spider9622eng-chat.com)
- [ ] DigitalOcean Droplet created
- [ ] Droplet IP address saved
- [ ] SSH access verified (`ssh root@YOUR_IP`)
- [ ] DNS A record points to Droplet IP
- [ ] DNS propagated (test with `nslookup`)
- [ ] Deployment script run on Droplet
- [ ] SSL certificate installed (certbot)
- [ ] App accessible at `https://spider9622eng-chat.com`
- [ ] Email configured for 2FA
- [ ] Supervisor services running (`supervisorctl status`)

---

## 🐛 Troubleshooting DNS

### Domain not resolving?

```bash
# Check DNS propagation
nslookup spider9622eng-chat.com

# Should show:
# Name: spider9622eng-chat.com
# Address: YOUR_DROPLET_IP
```

**If it doesn't:**
- Wait 5-30 minutes for propagation
- Clear DNS cache: `ipconfig /flushdns` (Windows)
- Try different DNS: Google (8.8.8.8) or Cloudflare (1.1.1.1)

### App shows "Connection Refused"?

```bash
# Check if services are running on Droplet
ssh root@YOUR_DROPLET_IP
supervisorctl status
nginx -t

# Check logs
tail -f /var/log/nginx/error.log
tail -f /var/www/chat/backend/storage/logs/laravel.log
```

### SSL certificate not working?

```bash
# Regenerate certificate
ssh root@YOUR_DROPLET_IP
certbot renew --force-renewal -d spider9622eng-chat.com

# Check certificate
certbot certificates
```

### WebSocket not connecting?

```bash
# Check Reverb running
ssh root@YOUR_DROPLET_IP
supervisorctl status chat-reverb

# View logs
tail -f /var/log/supervisor/chat-reverb.log
```

---

## 📊 Domain Configuration Reference

| Setting | Value |
|---------|-------|
| **Domain** | spider9622eng-chat.com |
| **Protocol** | HTTPS (SSL/TLS) |
| **A Record** | Points to DigitalOcean Droplet IP |
| **SSL Cert** | Let's Encrypt (auto-renews) |
| **Backend URL** | https://spider9622eng-chat.com/api |
| **WebSocket URL** | wss://spider9622eng-chat.com/app |
| **Frontend URL** | https://spider9622eng-chat.com |

---

## 🚀 Deployment Command (Updated)

Your deployment command is now:

```bash
cd /tmp
git clone https://github.com/YOUR_USERNAME/chat.git
cd chat && chmod +x deploy/setup.sh
./deploy/setup.sh
# Domain is pre-configured in setup.sh
```

---

## 📝 Configuration Files Updated

These files now reference your domain:

1. **backend/.env.production**
   ```
   APP_URL=https://spider9622eng-chat.com
   CORS_ALLOWED_ORIGINS="https://spider9622eng-chat.com"
   SESSION_DOMAIN=spider9622eng-chat.com
   ```

2. **deploy/nginx.conf**
   ```nginx
   server_name spider9622eng-chat.com;
   ssl_certificate /etc/letsencrypt/live/spider9622eng-chat.com/...
   ```

3. **deploy/setup.sh**
   ```bash
   # Domain pre-configured
   # No need to pass as parameter
   ```

---

## ✨ Summary

Your Chat House is now configured to use:

### **🌐 spider9622eng-chat.com**

**Next steps:**
1. ✅ Deploy to DigitalOcean Droplet (get IP)
2. ✅ Point DNS A record to Droplet IP
3. ✅ Wait for DNS propagation (5-30 min)
4. ✅ Setup SSL with certbot
5. ✅ Visit https://spider9622eng-chat.com

**Estimated time:** 30-45 minutes

---

## 📞 Need Help?

- **DNS issues?** → See Troubleshooting above
- **Deployment stuck?** → Check [DEPLOYMENT.md](../DEPLOYMENT.md)
- **WebSocket errors?** → Check `supervisorctl status chat-reverb`
- **SSL issues?** → Run `certbot certificates` to verify

---

**Your app will be live at: https://spider9622eng-chat.com** 🚀

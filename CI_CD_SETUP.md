# GitHub Actions CI/CD Setup Guide

This guide explains how to set up automated deployment using GitHub Actions.

## What It Does

When you push code to the `main` branch:

1. ✅ **Test Phase**: Runs PHP/TypeScript checks, builds frontend
2. 🚀 **Deploy Phase**: Automatically deploys to your DigitalOcean server
3. 📢 **Notify Phase**: Sends Slack/Discord notification

**Time to deploy**: ~5-10 minutes automatically

---

## Step 1: Add GitHub Secrets

GitHub Secrets store sensitive data (IP, SSH key, webhooks) securely.

### 1a. Generate SSH Key for Deployment

On your **local machine** (NOT on the Droplet):

```bash
# Generate a new key specifically for CI/CD
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy

# Press Enter twice (no passphrase)

# Display the private key
cat ~/.ssh/github_deploy
```

Copy the entire output (starts with `-----BEGIN OPENSSH PRIVATE KEY-----`)

### 1b. Add Private Key to Droplet

On your **Droplet**:

```bash
# Add GitHub Actions public key to authorized_keys
cat >> ~/.ssh/authorized_keys <<EOF
ssh-ed25519 AAAA... github-actions@github.com
EOF

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### 1c. Add Secrets to GitHub

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"

Add these secrets:

| Name | Value | From |
|------|-------|------|
| `DROPLET_IP` | `123.45.67.89` | DigitalOcean Droplet |
| `DEPLOY_SSH_KEY` | Private key | `cat ~/.ssh/github_deploy` |

**Optional Secrets** (for notifications):

| Name | Value | Where to Get |
|------|-------|---|
| `SLACK_WEBHOOK` | Slack incoming webhook URL | https://api.slack.com/messaging/webhooks |
| `DISCORD_WEBHOOK` | Discord webhook URL | Server Settings → Integrations → Webhooks |

---

## Step 2: Generate Slack Webhook (Optional)

### If you want Slack notifications:

1. Go to https://api.slack.com/apps
2. Create New App → From scratch
3. Name: "Chat House Bot"
4. Select your workspace
5. Incoming Webhooks → Turn On
6. Add New Webhook to Workspace
7. Select channel (e.g., #deployments)
8. Copy webhook URL
9. In GitHub Secrets, add as `SLACK_WEBHOOK`

---

## Step 3: Generate Discord Webhook (Optional)

### If you want Discord notifications:

1. In Discord, go to Server Settings → Integrations
2. Webhooks → New Webhook
3. Name: "Chat House"
4. Select channel
5. Copy webhook URL
6. In GitHub Secrets, add as `DISCORD_WEBHOOK`

---

## Step 4: Push Code to Trigger Deployment

```bash
cd d:\WorkSpace\chat

# Make a small change to trigger deployment
echo "# Updated at $(date)" >> README.md

# Commit and push
git add .
git commit -m "Trigger deployment"
git push origin main
```

Watch the deployment:

1. Go to GitHub repo
2. Click "Actions" tab
3. See workflow running in real-time
4. Wait for ✅ green checkmarks

---

## Troubleshooting CI/CD

### Workflow shows red ❌

Check the logs:

1. Click the failed workflow run
2. Click on the failed job
3. Expand the step to see error
4. Common issues:

| Error | Fix |
|-------|-----|
| "Permission denied" | SSH key not properly added to authorized_keys |
| "Connection refused" | DROPLET_IP is incorrect |
| "npm: not found" | Node.js not installed on Droplet |
| "composer: not found" | Composer not installed on Droplet |

### SSH connection fails

Test SSH manually:

```bash
ssh -i ~/.ssh/github_deploy root@YOUR_DROPLET_IP "echo 'Connected!'"
```

If fails, add key to Droplet:

```bash
ssh root@YOUR_DROPLET_IP
cat >> ~/.ssh/authorized_keys <<EOF
your_public_key_here
EOF
```

### Deployment succeeds but app is broken

Check logs on Droplet:

```bash
tail -f /var/www/chat/backend/storage/logs/laravel.log
tail -f /var/log/supervisor/chat-reverb.log
supervisorctl status
```

---

## CI/CD Workflow Events

The workflow runs automatically on:

- ✅ Push to `main` branch
- ✅ Pull request (test only, no deploy)
- ✅ Manual trigger (Actions tab → "Deploy to DigitalOcean" → "Run workflow")

**To prevent auto-deploy:**

If you don't want automatic deployment on every push:

Edit `.github/workflows/deploy.yml`:

```yaml
on:
  # Comment out push to disable auto-deploy
  # push:
  #   branches:
  #     - main
  workflow_dispatch:  # Manual only
```

---

## Advanced: Custom Deployment Strategy

### Deploy only on tags

```yaml
on:
  push:
    tags:
      - 'v*'  # Only deploy on v1.0.0, v1.0.1, etc
```

```bash
# Create a release tag and push
git tag v1.0.0
git push origin v1.0.0
```

### Deploy to staging first

Create another workflow `.github/workflows/deploy-staging.yml` that deploys to a staging Droplet first.

### Slack notifications with better format

Use `slack-notify-action@v2.0.0` for rich formatting:

```yaml
- name: Slack Notify
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "blocks": [
          {
            "type": "header",
            "text": {"type": "plain_text", "text": "Chat House Deployed 🚀"}
          },
          {"type": "divider"},
          {
            "type": "section",
            "fields": [
              {"type": "mrkdwn", "text": "*Commit:*\n<${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}|${{ github.sha }}>\n"},
              {"type": "mrkdwn", "text": "*Author:*\n${{ github.actor }}"}
            ]
          }
        ]
      }
```

---

## Monitoring Deployments

### View workflow history

GitHub Actions → Workflows → "Deploy to DigitalOcean"

### Get deployment alerts

1. **Email**: GitHub sends on workflow failure (default)
2. **Slack**: Add `SLACK_WEBHOOK` secret
3. **Discord**: Add `DISCORD_WEBHOOK` secret
4. **GitHub Pages**: View live status at `yourusername/chat/actions`

---

## Rollback if Deployment Fails

If deployment breaks your app:

```bash
# SSH into Droplet
ssh root@YOUR_DROPLET_IP

# Revert to previous commit
cd /var/www/chat
git revert HEAD --no-edit
git push origin main

# Manually restart services while GitHub Actions redeploys
supervisorctl restart all
```

Or disable auto-deploy:

```yaml
# Comment out in .github/workflows/deploy.yml
# on:
#   push:
#     branches:
#       - main
```

---

## Cost

- GitHub Actions: **Free** (first 2000 minutes/month)
- Each deploy: ~5-10 minutes
- **Estimated cost**: $0 for most users

---

## Next Steps

1. ✅ Add GitHub Secrets (DROPLET_IP, DEPLOY_SSH_KEY)
2. ✅ Push code to main branch
3. ✅ Watch deployment in Actions tab
4. ✅ Visit your site to verify it's live

That's it! You now have automated CI/CD. Every `git push` deploys automatically. 🚀

# Frontend Optimization Guide for Chat House

## Performance Optimizations

### 1. **Code Splitting** - Reduce initial bundle size
Currently App.tsx is monolithic (~1000 lines). Split into:

```
src/
├── components/
│   ├── Auth/
│   │   ├── AuthScreen.tsx      (login/register/2FA)
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── TwoFactorForm.tsx
│   ├── Chat/
│   │   ├── ChatWindow.tsx       (main chat interface)
│   │   ├── MessageList.tsx      (virtualized message list)
│   │   ├── MessageInput.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── AttachmentPreview.tsx
│   ├── Sidebar/
│   │   ├── UserList.tsx         (online users)
│   │   ├── ConversationItem.tsx
│   │   └── SearchBar.tsx
│   ├── Profile/
│   │   ├── UserProfile.tsx      (profile view)
│   │   ├── ProfileEditor.tsx
│   │   └── PublicProfile.tsx
│   └── Common/
│       ├── Header.tsx
│       ├── Theme.tsx
│       └── Loading.tsx
├── hooks/
│   ├── useAuth.ts              (authentication)
│   ├── useChat.ts              (messaging logic)
│   ├── usePresence.ts          (online users)
│   ├── useNotifications.ts     (toasts)
│   └── useWebSocket.ts         (Reverb connection)
├── services/
│   ├── api.ts                  (API calls)
│   ├── broadcast.ts            (WebSocket events)
│   └── storage.ts              (localStorage)
├── types/
│   └── index.ts                (TypeScript interfaces)
├── utils/
│   ├── format.ts               (date/text formatting)
│   ├── validation.ts           (form validation)
│   └── config.ts               (environment config)
└── App.tsx                     (lean root component)
```

### 2. **Lazy Loading** - Load components only when needed
```typescript
// Add to App.tsx
import { lazy, Suspense } from 'react';
const ChatWindow = lazy(() => import('./components/Chat/ChatWindow'));
const ProfileEditor = lazy(() => import('./components/Profile/ProfileEditor'));

// In render:
<Suspense fallback={<Loading />}>
  <ChatWindow />
</Suspense>
```

### 3. **Virtualization** - Render only visible messages
For message list with 1000+ messages:
```bash
npm install react-window
```

```typescript
// src/components/Chat/MessageList.tsx
import { FixedSizeList } from 'react-window';

const MessageList = ({ messages }) => (
  <FixedSizeList
    height={600}
    itemCount={messages.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <Message message={messages[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

### 4. **Image Optimization**
- Add WebP support with fallback
- Lazy load images in profile/attachments
- Compress avatar images

```typescript
// Lazy load images
<img loading="lazy" src="avatar.jpg" alt="User avatar" />
```

### 5. **Memoization** - Prevent unnecessary re-renders
```typescript
import { memo } from 'react';

export const Message = memo(({ message }) => (
  <div>{message.body}</div>
), (prev, next) => prev.message.id === next.message.id);
```

### 6. **Bundle Analysis**
```bash
npm install --save-dev vite-plugin-visualizer
```

In vite.config.ts:
```typescript
import { visualizer } from 'vite-plugin-visualizer';
export default {
  plugins: [visualizer()],
}
```

Run: `npm run build` then open `dist/stats.html`

---

## Database Optimizations

### 1. **Indexing** - Add critical indexes for production
```php
// In a new migration: database/migrations/2026_09_12_000000_add_performance_indexes.php

Schema::table('messages', function (Blueprint $table) {
    $table->index(['sender_id', 'recipient_id', 'created_at']);
    $table->index(['recipient_id', 'created_at']);
});

Schema::table('users', function (Blueprint $table) {
    $table->index(['last_seen_at']);
    $table->index(['email']);
});
```

Run: `php artisan migrate`

### 2. **Query Optimization** - Eager load relationships
```php
// ChatController.php - Load messages with user data
$messages = Message::with('sender')
    ->where('recipient_id', auth()->id())
    ->orWhere('sender_id', auth()->id())
    ->latest()
    ->limit(50)
    ->get();
```

### 3. **Caching** - Cache frequently accessed data
```php
// In controller
use Illuminate\Support\Facades\Cache;

$users = Cache::remember('online_users', 30, function () {
    return User::where('last_seen_at', '>', now()->subSeconds(30))
        ->select('id', 'name', 'email')
        ->get();
});
```

### 4. **Archive Old Messages** - Keep table size manageable
```php
// database/migrations/2026_09_12_add_message_archives_table.php
Schema::create('message_archives', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('message_id');
    $table->json('data');
    $table->timestamp('archived_at');
});
```

---

## Backend Optimizations

### 1. **Enable OPcache** - Compile PHP to opcode
```bash
# Add to /etc/php/8.3/fpm/php.ini
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.validate_timestamps=0
```

### 2. **Use Redis** - Cache and sessions
```bash
# Install on server
apt install redis-server

# Update .env.production
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

### 3. **Optimize Composer** - Faster class loading
```bash
cd backend && composer dump-autoload --optimize --no-dev
```

### 4. **Gzip Compression** - Reduce response size
Nginx config already has gzip enabled (see nginx.conf)

### 5. **Monitor Performance**
```bash
# Install monitoring tools
php artisan telescope:install  # Local development only
php artisan tinker
>>> DB::listen(fn ($query) => dump($query->sql));
```

---

## Security Optimizations

### 1. **CORS Hardening** - Only allow your domain
In `config/cors.php`:
```php
'allowed_origins' => [env('CORS_ALLOWED_ORIGINS', 'https://yourdomain.com')],
```

### 2. **Rate Limiting** - Protect from abuse
```php
// routes/api.php
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/login', [ChatController::class, 'login']);
});
```

### 3. **Content Security Policy** - Nginx header
Already in nginx.conf with security headers

### 4. **HTTPS Only** - Force SSL in production
```php
// config/app.php
'url' => env('APP_URL', 'https://yourdomain.com'),
'scheme' => 'https',
```

---

## Monitoring & Logging

### 1. **Error Tracking** - Sentry integration
```bash
npm install @sentry/react
composer require sentry/sentry-laravel
```

### 2. **Performance Monitoring**
```bash
# New Relic APM
export NEW_RELIC_LICENSE_KEY=your_key
php artisan serve
```

### 3. **Log Rotation**
Already configured in `config/logging.php`

---

## Deployment Checklist

- [ ] Run migrations: `php artisan migrate --force`
- [ ] Clear caches: `php artisan cache:clear config:clear view:clear`
- [ ] Optimize classes: `php artisan optimize`
- [ ] Build frontend: `npm run build`
- [ ] Set permissions: `chown -R www-data:www-data storage/`
- [ ] Enable OPcache in PHP
- [ ] Install Redis if using cache/sessions
- [ ] Configure SSL certificate
- [ ] Set up monitoring (Sentry/New Relic)
- [ ] Configure backups for database
- [ ] Set up CDN for static assets (optional)

---

## Expected Performance Gains

| Optimization | Impact | Difficulty |
|---|---|---|
| Code splitting | 30-40% smaller initial bundle | Medium |
| Message virtualization | 10x faster scrolling with 1000+ messages | Medium |
| Database indexing | 100x faster message queries | Easy |
| Redis caching | 5x faster user list loads | Medium |
| OPcache + gzip | 20-30% faster response times | Easy |
| Image optimization | 50% smaller assets | Easy |

**Total estimated improvement: 3-5x faster application**

# PWA Setup Guide

This guide will help you set up and test Progressive Web App (PWA) features in Pingflare.

## Quick Start

The PWA functionality is already configured and ready to use. The service worker is automatically generated during the build process.

## Testing PWA Features

### 1. Build and Preview

```bash
# Build the production version
npm run build

# Start the preview server
npm run preview
```

### 2. Test in Browser

1. Open http://localhost:4173 in Chrome/Edge
2. Open DevTools (F12)
3. Go to **Application** tab
4. Check the following sections:
   - **Service Workers**: Should show an active service worker
   - **Manifest**: Should show app details (name, icons, etc.)
   - **Storage**: Can inspect cached files

### 3. Test Offline Mode

1. In DevTools > Application > Service Workers
2. Check the "Offline" checkbox
3. Reload the page - it should still work!
4. Navigate to different routes - cached pages load instantly

### 4. Test Notifications

1. On the homepage, click "Request Notification Permission"
2. Allow notifications when prompted
3. Click "Show Test Notification"
4. You should see a notification appear

## Push Notifications Setup

For production push notifications, you need to:

### 1. Generate VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
```

This will output:

```
Public Key: BJ...
Private Key: ...
```

### 2. Configure Your Backend

Store the keys securely:

- **Public Key**: Can be shared with the client
- **Private Key**: MUST be kept secret on your server

### 3. Subscribe Users

Use the utility functions from `src/lib/pwa.ts`:

```typescript
import { subscribeToPushNotifications } from '$lib/pwa';

const subscription = await subscribeToPushNotifications('YOUR_PUBLIC_VAPID_KEY');

// Send subscription to your backend
await fetch('/api/push/subscribe', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(subscription)
});
```

### 4. Send Notifications from Server

Use the `web-push` library on your backend:

```javascript
const webpush = require('web-push');

webpush.setVapidDetails('mailto:your-email@example.com', 'PUBLIC_VAPID_KEY', 'PRIVATE_VAPID_KEY');

webpush.sendNotification(
	subscription,
	JSON.stringify({
		title: 'Pingflare Alert',
		body: 'Your monitor detected downtime',
		icon: '/icon.svg',
		data: { url: '/monitors/123' }
	})
);
```

## Install as App

### Desktop (Chrome/Edge)

1. Visit your deployed site
2. Look for the install icon in the address bar (+ or ⊕)
3. Click "Install"
4. The app opens in a standalone window

### Mobile (Chrome/Safari)

**Chrome Android:**

1. Visit your site
2. Tap the menu (⋮)
3. Tap "Add to Home screen"
4. Confirm

**Safari iOS:**

1. Visit your site
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Confirm

## Customization

### Update App Manifest

Edit `vite.config.ts` to customize:

```typescript
VitePWA({
	manifest: {
		short_name: 'Your App',
		name: 'Your App Name',
		theme_color: '#your-color',
		background_color: '#your-bg',
		icons: [
			// Add your icons
		]
	}
});
```

### Customize Caching Strategy

In `vite.config.ts`, configure the workbox options:

```typescript
VitePWA({
	workbox: {
		globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
		runtimeCaching: [
			{
				urlPattern: /^https:\/\/api\.example\.com\/.*/i,
				handler: 'NetworkFirst',
				options: {
					cacheName: 'api-cache',
					expiration: {
						maxEntries: 50,
						maxAgeSeconds: 60 * 60 * 24 // 1 day
					}
				}
			}
		]
	}
});
```

### Caching Strategies

- **CacheFirst**: Check cache, then network (good for static assets)
- **NetworkFirst**: Try network, fallback to cache (good for API calls)
- **StaleWhileRevalidate**: Return cached version, update in background (good for images)
- **NetworkOnly**: Always use network (for real-time data)
- **CacheOnly**: Only use cache (for offline-first apps)

## Debugging

### Check Service Worker Status

```javascript
navigator.serviceWorker.ready.then((registration) => {
	console.log('Service Worker registered:', registration);
});
```

### Manually Unregister

If you need to reset:

```javascript
navigator.serviceWorker.getRegistrations().then((registrations) => {
	registrations.forEach((registration) => registration.unregister());
});
```

### Clear Cache

```javascript
caches.keys().then((names) => {
	names.forEach((name) => caches.delete(name));
});
```

## Lighthouse Audit

Test your PWA score:

1. Open DevTools
2. Go to **Lighthouse** tab
3. Select "Progressive Web App" category
4. Click "Generate report"
5. Aim for 90+ score!

## Production Checklist

- [ ] HTTPS enabled (required for PWA)
- [ ] Icons generated (192x192, 512x512)
- [ ] Manifest configured correctly
- [ ] Service worker registered
- [ ] Offline page works
- [ ] VAPID keys generated (for push)
- [ ] Push notification backend ready
- [ ] Lighthouse PWA score 90+

## Troubleshooting

### Service Worker Not Registering

- Check browser console for errors
- Ensure you're running on HTTPS (or localhost)
- Clear browser cache and try again

### Notifications Not Working

- Check notification permission status
- Ensure service worker is active
- Test in Chrome first (best PWA support)
- Check browser notification settings

### App Not Installable

- Check manifest.json is valid
- Ensure all required icons exist
- Run Lighthouse audit to see what's missing
- Make sure you're on HTTPS

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)

## Support

For issues or questions, check:

- `Agents.md` - Development guidelines
- `README.md` - Project overview
- `src/lib/pwa.ts` - PWA utility functions

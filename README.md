# Registry Lens

A modern, lightweight web interface for browsing and managing Docker Registry images.

## What is Registry Lens?

Registry Lens is a client-side web application that connects to any Docker Registry v2 API and provides a user-friendly interface for:

- Browsing repositories and tags
- Viewing image metadata (size, creation date, platform, layers)
- Managing multi-platform (multi-arch) images
- Copying pull commands

**No server required** - the app runs entirely in your browser and communicates directly with your Docker Registry.

## Features

- **Repository Browser** - Browse all repositories with instant client-side filtering
- **Tag Management** - View all tags sorted by version (newest first)
- **Image Details** - See full manifest info, layers, sizes, and creation dates
- **Multi-Platform Support** - View all available platforms for multi-arch images
- **Secure Credentials** - Uses Credential Management API (falls back to sessionStorage)
- **Local Caching** - Image info cached in localStorage for faster navigation (24h TTL)
- **Dark/Light Mode** - Toggle between themes
- **Responsive Design** - Works on desktop and mobile

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Production (GitHub Pages)

The app is configured for GitHub Pages deployment:

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

For automatic deployment, push to `main` branch - GitHub Actions will build and deploy to GitHub Pages.

## CORS Configuration

### Development

In development mode, Vite proxy handles CORS automatically. All requests to `/registry-api/*` are forwarded to your registry's `/v2/*` endpoints.

### Production

For production (GitHub Pages, static hosting), your Docker Registry must be configured to allow CORS:

**Option 1: Registry with CORS headers**

Configure your registry or reverse proxy to add:
```
Access-Control-Allow-Origin: https://your-github-pages-url.github.io
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

**Option 2: Reverse Proxy (nginx example)**

```nginx
location /v2/ {
    proxy_pass http://registry:5000;

    # CORS headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

    if ($request_method = OPTIONS) {
        return 204;
    }
}
```

## Tech Stack

- **Vue 3** - Composition API
- **PrimeVue 4** - UI components with Aura theme
- **Vite 7** - Build tool and dev server
- **Docker Registry v2 API** - Standard registry protocol

## Project Structure

```
src/
├── components/       # Vue components
│   ├── LoginForm.vue
│   ├── RegistryBrowser.vue
│   └── ImageDetails.vue
├── composables/      # Vue composables
│   └── useRegistry.js
├── services/         # API and utility services
│   ├── registryApi.js
│   ├── credentialStore.js
│   └── imageCache.js
└── App.vue           # Main app component
```

## Author

Created by [@kpiegza](https://github.com/kpiegza)

## License

MIT

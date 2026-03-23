# AI Architecture Render Frontend

Stable frontend starter for the AI architectural rendering website.

## Stable Stack

- Next.js `14.2.35`
- React `18.3.1`
- Tailwind CSS `3.4.19`

## Run Locally

```bash
cd D:\arch\frontend
npm install
copy .env.local.example .env.local
npm run dev -- --port 3001
```

If PowerShell blocks `npm.ps1`, use:

```bash
cd D:\arch\frontend
npm.cmd install
Copy-Item .env.local.example .env.local
npm.cmd run dev -- --port 3001
```

If your backend is not running on `http://localhost:3000`, edit `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Then open:

```text
http://localhost:3001
```

## Upload Testing

1. Start the backend service:

```bash
cd D:\arch
npm.cmd run dev
```

2. Start the frontend service:

```bash
cd D:\arch\frontend
npm.cmd run dev -- --port 3001
```

3. Open `http://localhost:3001`.
4. Select a `jpg/jpeg/png/webp` image smaller than `10MB`.
5. The upload panel should:
   show local preview
   call `POST http://localhost:3000/api/upload`
   display the returned server image URL after success
6. If you select an unsupported type or a file larger than `10MB`, the panel should show a validation error before sending the request.
7. If the backend is unavailable, the panel should show an upload failure message.

The frontend now calls the backend directly by using `NEXT_PUBLIC_API_BASE_URL`. This means the backend must allow the frontend origin through CORS when the frontend runs on a different port or domain.

## Manual Download Fallback

If `npm install` gets stuck when downloading Next SWC binaries on Windows, try:

```bash
npm.cmd install @next/swc-win32-x64-msvc@14.2.35
```

If the network is still unstable, you can manually download this package tarball in a browser:

```text
https://registry.npmjs.org/@next/swc-win32-x64-msvc/-/swc-win32-x64-msvc-14.2.35.tgz
```

Download it into `D:\arch\frontend`, then tell me and I will guide you through the extraction step.

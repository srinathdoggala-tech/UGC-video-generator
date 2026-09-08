# UGC Video Generator

An AI-organized UGC (User-Generated Content) marketing video generator built with Next.js and FFmpeg. Enter any product website URL in the chat interface to automatically extract metadata, organize marketing angles with AI, and assemble an authentic 8-second vertical UGC video with all 4 required layers.

## Key Features

- **Conversational Chat Interface**: Differentiates between casual conversation ("hi", "what can you do?") and product URLs. Only product URLs trigger video generation.
- **Automated Product Extraction**: Fetches and parses product pages using Cheerio and Axios to extract title, description, Open Graph tags, and product images.
- **AI Asset Organization**: Analyzes product benefits and structures a multi-scene UGC marketing storyboard with hooks, subtitles, and asset keywords (OpenAI GPT-4o-mini with local fallback).
- **Four-Layer Video Composition**:
  1. **Background**: Dynamic visuals (photo/video) scaled and cropped to vertical 9:16 (720x1280).
  2. **Prominent GIF Overlay**: Prominent centered animated multi-frame GIF looping continuously.
  3. **Trendy Text Overlays**: Styled product header badge, hook caption, and timed scene subtitles.
  4. **Trending Audio Track**: Upbeat royalty-free soundtrack synchronized with video duration.
- **Standard Browser Playback**: Video served via `/api/video/[...slug]` with HTTP 200/206 byte-range streaming support.

## Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **UI & Styling**: React 19, Tailwind CSS
- **Media Engine**: Native FFmpeg (via `ffmpeg-static` and system binary)
- **Web Scraping**: Axios, Cheerio
- **Language**: TypeScript

## How Video Generation Works

1. **URL Detection**: Detects standard `https://` URLs or bare domain names (e.g., `calai.app`).
2. **Extraction**: Scrapes title, description, and visual assets from the target page.
3. **AI Planning**: Generates structured JSON video plan (hook, scenes, durations, asset keywords).
4. **Asset Selection**: Matches storyboard keywords to validated high-resolution backgrounds, animated reaction GIFs, and audio tracks in `public/assets/`.
5. **Assembly**: A single-pass FFmpeg pipeline composites the 4 layers, adds styled typography with subtitle boxes, multiplexes the audio track, and outputs an H.264/AAC MP4.
6. **Delivery**: Returns the streaming URL to the client for instant browser playback.

## Environment Variables

Create a `.env.local` file in `ugc-video-generator/` (optional):

```env
# Optional: OpenAI API Key for dynamic LLM storyboard generation.
# If omitted, a robust built-in marketing strategy engine is used.
OPENAI_API_KEY=your_openai_api_key_here
```

## Running Locally

1. **Install dependencies**:
   ```bash
   cd ugc-video-generator
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Verify build**:
   ```bash
   npm run build
   ```

## Production Deployment

Because this application executes native FFmpeg at runtime and writes generated videos to storage, a containerized runtime or server with persistent storage is required.

### 1. Docker Deployment (Recommended)

A production multi-stage `Dockerfile` is provided:
```bash
cd ugc-video-generator
docker build -t ugc-video-generator .
docker run -p 3000:3000 ugc-video-generator
```

### 2. Render / Railway / Fly.io

- **Render**: Connect repository, use `render.yaml` (Docker runtime).
- **Railway**: Connect repository; Nixpacks automatically detects Node.js and installs FFmpeg.

## Agent Capture Verification

The `.agent-logs/` directory records execution logs:
```bash
node capture.js
```

import { VideoPlan, Asset, ProductInfo, VideoRenderResult } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

function resolveFfmpegBinary(): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(process.cwd(), '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    'C:\\Users\\dogga\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to ffmpeg in PATH or standard linux path
  return 'ffmpeg';
}

function resolveFontFile(): string {
  const bundledFont = path.join(process.cwd(), 'public', 'assets', 'fonts', 'font.ttf');
  if (fs.existsSync(bundledFont)) {
    return bundledFont;
  }
  const altBundledFont = path.join(process.cwd(), 'ugc-video-generator', 'public', 'assets', 'fonts', 'font.ttf');
  if (fs.existsSync(altBundledFont)) {
    return altBundledFont;
  }
  return 'Arial';
}

function escapeFfmpegDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function resolveAssetPath(asset: Asset | undefined, fallbackRel: string): string {
  if (asset?.localPath && fs.existsSync(asset.localPath)) {
    return asset.localPath;
  }
  const primary = path.join(process.cwd(), fallbackRel);
  if (fs.existsSync(primary)) {
    return primary;
  }
  const secondary = path.join(process.cwd(), 'ugc-video-generator', fallbackRel);
  if (fs.existsSync(secondary)) {
    return secondary;
  }
  return primary;
}

export async function renderVideo(
  plan: VideoPlan,
  assets: Asset[],
  productInfo: ProductInfo
): Promise<VideoRenderResult> {
  const ffmpegPath = resolveFfmpegBinary();
  console.log(`[video] resolved ffmpeg path: ${ffmpegPath}`);

  // Storage directory for generated videos
  const storageDir = path.join(process.cwd(), 'public', 'generated-videos');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const duration = Math.min(10, Math.max(5, plan.video.duration || 6));
  const filename = `ugc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.mp4`;
  const outputPath = path.join(storageDir, filename);

  // Identify assets
  const bgAsset = assets.find(a => a.type === 'background');
  const gifAsset = assets.find(a => a.type === 'gif');
  const audioAsset = assets.find(a => a.type === 'audio');
  const prodAsset = assets.find(a => a.type === 'productImage');

  const bgPath = resolveAssetPath(bgAsset, 'public/assets/backgrounds/tech.jpg');
  const gifPath = resolveAssetPath(gifAsset, 'public/assets/gifs/excited.gif');
  const audioPath = resolveAssetPath(audioAsset, 'public/assets/audio/upbeat.mp3');
  const prodPath = prodAsset?.localPath && fs.existsSync(prodAsset.localPath) ? prodAsset.localPath : null;

  const fontFile = resolveFontFile().replace(/\\/g, '/').replace(/:/g, '\\:');

  // Text overlay lines
  const hookTitle = escapeFfmpegDrawText((plan.product.name || productInfo.title || 'NEW PRODUCT').toUpperCase().slice(0, 32));
  const hookText = escapeFfmpegDrawText(plan.video.hook ? `"${plan.video.hook.slice(0, 50)}"` : 'Check out this game changer!');
  const scene1Text = escapeFfmpegDrawText((plan.video.scenes[0]?.text || 'Discover a better way').slice(0, 50));
  const scene2Text = escapeFfmpegDrawText((plan.video.scenes[1]?.text || 'Simple, fast, and effective').slice(0, 50));

  const midPoint = Math.floor(duration / 2);

  // Assemble FFmpeg CLI arguments
  const args: string[] = [
    '-y',
    // Input 0: Background image (looped)
    '-loop', '1',
    '-t', duration.toString(),
    '-i', bgPath,
    // Input 1: Animated GIF (looped continuously)
    '-ignore_loop', '0',
    '-t', duration.toString(),
    '-i', gifPath,
    // Input 2: Audio track (looped if needed)
    '-stream_loop', '-1',
    '-t', duration.toString(),
    '-i', audioPath,
  ];

  let hasProdImg = false;
  if (prodPath) {
    args.push('-loop', '1', '-t', duration.toString(), '-i', prodPath);
    hasProdImg = true;
  }

  // Assemble filter complex
  const filterParts: string[] = [];
  // 1. Scale and center background to 9:16 vertical (720x1280)
  filterParts.push('[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[bg]');
  // 2. Scale prominent GIF (centered, 380x380)
  filterParts.push('[1:v]scale=380:380:force_original_aspect_ratio=decrease[gif]');

  if (hasProdImg) {
    filterParts.push('[3:v]scale=150:150:force_original_aspect_ratio=decrease[prod]');
    filterParts.push('[bg][gif]overlay=(W-w)/2:(H-h)/2-40:shortest=0[v1]');
    filterParts.push('[v1][prod]overlay=40:H-h-240[v2]');
  } else {
    filterParts.push('[bg][gif]overlay=(W-w)/2:(H-h)/2-40:shortest=0[v2]');
  }

  // 3. Add stylish text overlays
  const textFilters: string[] = [
    // Top banner badge: Product name
    `drawtext=fontfile='${fontFile}':text='${hookTitle}':fontsize=30:fontcolor=yellow:x=(w-text_w)/2:y=80:box=1:boxcolor=black@0.75:boxborderw=10`,
    // Hook text below title
    `drawtext=fontfile='${fontFile}':text='${hookText}':fontsize=26:fontcolor=white:x=(w-text_w)/2:y=135:box=1:boxcolor=black@0.65:boxborderw=8`,
    // Scene 1 text in lower area (first half)
    `drawtext=fontfile='${fontFile}':text='${scene1Text}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h-th-130:box=1:boxcolor=black@0.75:boxborderw=12:enable='between(t,0,${midPoint})'`,
    // Scene 2 text in lower area (second half)
    `drawtext=fontfile='${fontFile}':text='${scene2Text}':fontsize=32:fontcolor=white:x=(w-text_w)/2:y=h-th-130:box=1:boxcolor=black@0.75:boxborderw=12:enable='between(t,${midPoint},${duration})'`,
  ];

  filterParts.push(`[v2]${textFilters.join(',')}[vout]`);

  args.push(
    '-filter_complex', filterParts.join(';'),
    '-map', '[vout]',
    '-map', '2:a:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-t', duration.toString(),
    '-shortest',
    outputPath
  );

  console.log(`[video] rendering started with duration=${duration}s`);

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[video] rendering failed (code ${code}):`, stderr.slice(-800));
        return reject(new Error(`FFmpeg exited with code ${code}`));
      }

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
        return reject(new Error('Rendered video file is missing or empty'));
      }

      console.log(`[video] verifying output: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);

      resolve({
        videoUrl: `/api/video/${filename}`,
        localPath: outputPath,
        duration,
      });
    });

    proc.on('error', (err) => {
      console.error('[video] rendering process spawn error:', err);
      reject(err);
    });
  });
}
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

/**
 * Normalize a product title for video overlay:
 * - Strip common separators like " | ", " — ", " - " from site names
 * - Take only the meaningful product name portion
 * - Ensure it fits within the video frame at the given font size
 */
function normalizeTitle(raw: string, maxCharsPerLine: number = 24): { line1: string; line2: string } {
  // Clean and extract product name
  let cleaned = raw.trim();
  
  // Split on common title separators and take the most meaningful part
  const separators = [' | ', ' — ', ' – ', ' - ', ': '];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      // If first part is short (likely the product name), use both parts as separate lines
      if (parts[0].length <= maxCharsPerLine) {
        const line1 = parts[0].trim().toUpperCase();
        const line2 = parts.slice(1).join(' ').trim();
        // Truncate line2 intelligently at word boundary
        const shortLine2 = truncateAtWord(line2, maxCharsPerLine + 8);
        return { line1, line2: shortLine2 };
      }
      // Otherwise just use the first part
      cleaned = parts[0].trim();
      break;
    }
  }
  
  cleaned = cleaned.toUpperCase();
  
  // If it fits on one line, use it
  if (cleaned.length <= maxCharsPerLine) {
    return { line1: cleaned, line2: '' };
  }
  
  // Split into two lines at a word boundary
  const mid = Math.ceil(cleaned.length / 2);
  let splitAt = cleaned.lastIndexOf(' ', mid + 4);
  if (splitAt <= 0 || splitAt < mid - 8) {
    splitAt = cleaned.indexOf(' ', mid - 4);
  }
  if (splitAt <= 0) {
    // Can't split well — truncate
    return { line1: truncateAtWord(cleaned, maxCharsPerLine), line2: '' };
  }
  
  return {
    line1: truncateAtWord(cleaned.substring(0, splitAt).trim(), maxCharsPerLine + 4),
    line2: truncateAtWord(cleaned.substring(splitAt).trim(), maxCharsPerLine + 4),
  };
}

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.5) {
    return truncated.substring(0, lastSpace).trim();
  }
  return truncated.trim();
}

/**
 * Calculate a dynamic font size that fits text within the video width (720px)
 * with safe margins on both sides.
 */
function dynamicFontSize(text: string, baseFontSize: number, maxWidth: number = 660): number {
  // Approximate: each character is ~0.55x the font size for typical fonts
  const approxWidth = text.length * baseFontSize * 0.55;
  if (approxWidth <= maxWidth) return baseFontSize;
  // Scale down proportionally, with a minimum
  const scaled = Math.floor(baseFontSize * (maxWidth / approxWidth));
  return Math.max(18, scaled);
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

  // Text overlay lines — intelligent fitting
  const rawTitle = plan.product.name || productInfo.title || 'NEW PRODUCT';
  const titleLines = normalizeTitle(rawTitle);
  const hookTitleL1 = escapeFfmpegDrawText(titleLines.line1);
  const hookTitleL2 = titleLines.line2 ? escapeFfmpegDrawText(titleLines.line2) : '';
  const hookText = escapeFfmpegDrawText(
    plan.video.hook
      ? `"${truncateAtWord(plan.video.hook, 45)}"`
      : 'Check out this game changer!'
  );
  const scene1Text = escapeFfmpegDrawText(truncateAtWord(plan.video.scenes[0]?.text || 'Discover a better way', 40));
  const scene2Text = escapeFfmpegDrawText(truncateAtWord(plan.video.scenes[1]?.text || 'Simple, fast, and effective', 40));

  // Dynamic font sizes
  const titleFontSize1 = dynamicFontSize(titleLines.line1, 32);
  const titleFontSize2 = hookTitleL2 ? dynamicFontSize(titleLines.line2, 26) : 0;
  const hookFontSize = dynamicFontSize(hookText, 24);

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

  // Assemble filter complex
  const filterParts: string[] = [];
  // 1. Scale and center background to 9:16 vertical (720x1280)
  filterParts.push('[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[bg]');
  // 2. Scale prominent GIF (centered, 380x380)
  filterParts.push('[1:v]scale=380:380:force_original_aspect_ratio=decrease[gif]');
  filterParts.push('[bg][gif]overlay=(W-w)/2:(H-h)/2-40:shortest=0[v2]');

  // 3. Add stylish text overlays with dynamic sizing
  const textFilters: string[] = [
    // Top banner: Product name line 1
    `drawtext=fontfile='${fontFile}':text='${hookTitleL1}':fontsize=${titleFontSize1}:fontcolor=yellow:x=(w-text_w)/2:y=60:box=1:boxcolor=black@0.75:boxborderw=10`,
  ];
  // Optional second title line
  if (hookTitleL2) {
    textFilters.push(
      `drawtext=fontfile='${fontFile}':text='${hookTitleL2}':fontsize=${titleFontSize2}:fontcolor=white:x=(w-text_w)/2:y=${60 + titleFontSize1 + 20}:box=1:boxcolor=black@0.65:boxborderw=8`
    );
  }
  // Hook/tagline text
  const hookY = hookTitleL2 ? 60 + titleFontSize1 + 20 + titleFontSize2 + 16 : 60 + titleFontSize1 + 20;
  textFilters.push(
    `drawtext=fontfile='${fontFile}':text='${hookText}':fontsize=${hookFontSize}:fontcolor=white:x=(w-text_w)/2:y=${hookY}:box=1:boxcolor=black@0.65:boxborderw=8`
  );
  // Scene text in lower area with safe margins
  const sceneFontSize1 = dynamicFontSize(scene1Text, 30);
  const sceneFontSize2 = dynamicFontSize(scene2Text, 30);
  textFilters.push(
    `drawtext=fontfile='${fontFile}':text='${scene1Text}':fontsize=${sceneFontSize1}:fontcolor=white:x=(w-text_w)/2:y=h-th-120:box=1:boxcolor=black@0.75:boxborderw=12:enable='between(t,0,${midPoint})'`,
    `drawtext=fontfile='${fontFile}':text='${scene2Text}':fontsize=${sceneFontSize2}:fontcolor=white:x=(w-text_w)/2:y=h-th-120:box=1:boxcolor=black@0.75:boxborderw=12:enable='between(t,${midPoint},${duration})'`
  );

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
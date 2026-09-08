import { Asset, VideoPlan } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';

// Verified local assets in public/assets/
const LOCAL_BACKGROUNDS: Record<string, string> = {
  tech: 'public/assets/backgrounds/tech.jpg',
  lifestyle: 'public/assets/backgrounds/lifestyle.jpg',
  fitness: 'public/assets/backgrounds/fitness.jpg',
  default: 'public/assets/backgrounds/tech.jpg',
};

const LOCAL_GIFS: Record<string, string> = {
  excited: 'public/assets/gifs/excited.gif',
  celebration: 'public/assets/gifs/celebration.gif',
  fire: 'public/assets/gifs/fire.gif',
  wow: 'public/assets/gifs/wow.gif',
  love: 'public/assets/gifs/love.gif',
  default: 'public/assets/gifs/excited.gif',
};

const LOCAL_AUDIO: Record<string, string> = {
  upbeat: 'public/assets/audio/upbeat.mp3',
  energetic: 'public/assets/audio/energetic.mp3',
  trendy: 'public/assets/audio/trendy.mp3',
  default: 'public/assets/audio/upbeat.mp3',
};

function resolveLocalPath(relPath: string): string {
  const fullPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  // Try relative to workspace
  const altPath = path.join(process.cwd(), 'ugc-video-generator', relPath);
  if (fs.existsSync(altPath)) {
    return altPath;
  }
  return fullPath;
}

export async function selectAssets(plan: VideoPlan, productImages: string[]): Promise<Asset[]> {
  const assets: Asset[] = [];

  // 1. Select background
  const bgKeyword = plan.video.scenes[0]?.backgroundKeyword?.toLowerCase() || 'tech';
  let chosenBgRel = LOCAL_BACKGROUNDS[bgKeyword] || LOCAL_BACKGROUNDS['default']!;
  if (bgKeyword.includes('life') || bgKeyword.includes('home')) {
    chosenBgRel = LOCAL_BACKGROUNDS['lifestyle']!;
  } else if (bgKeyword.includes('fit') || bgKeyword.includes('sport') || bgKeyword.includes('health')) {
    chosenBgRel = LOCAL_BACKGROUNDS['fitness']!;
  }
  const bgLocalPath = resolveLocalPath(chosenBgRel);

  assets.push({
    type: 'background',
    url: chosenBgRel,
    localPath: bgLocalPath,
    keyword: bgKeyword,
  });

  // 2. Select prominent animated GIF
  const gifKeyword = (plan.video.scenes.find(s => s.gifKeyword)?.gifKeyword || 'excited').toLowerCase();
  let chosenGifRel = LOCAL_GIFS['excited']!;
  if (gifKeyword.includes('celeb') || gifKeyword.includes('happy')) {
    chosenGifRel = LOCAL_GIFS['celebration']!;
  } else if (gifKeyword.includes('fire') || gifKeyword.includes('hot')) {
    chosenGifRel = LOCAL_GIFS['fire']!;
  } else if (gifKeyword.includes('wow') || gifKeyword.includes('mind')) {
    chosenGifRel = LOCAL_GIFS['wow']!;
  } else if (gifKeyword.includes('love')) {
    chosenGifRel = LOCAL_GIFS['love']!;
  }
  const gifLocalPath = resolveLocalPath(chosenGifRel);

  assets.push({
    type: 'gif',
    url: chosenGifRel,
    localPath: gifLocalPath,
    keyword: gifKeyword,
  });

  // 3. Select audio
  const audioKeyword = (plan.video.tone || 'upbeat').toLowerCase();
  let chosenAudioRel = LOCAL_AUDIO['upbeat']!;
  if (audioKeyword.includes('energetic')) {
    chosenAudioRel = LOCAL_AUDIO['energetic']!;
  } else if (audioKeyword.includes('trendy')) {
    chosenAudioRel = LOCAL_AUDIO['trendy']!;
  }
  const audioLocalPath = resolveLocalPath(chosenAudioRel);

  assets.push({
    type: 'audio',
    url: chosenAudioRel,
    localPath: audioLocalPath,
    keyword: audioKeyword,
  });

  // 4. Safely attempt to download a product image if available
  if (productImages && productImages.length > 0) {
    const cacheDir = path.join(os.tmpdir(), 'ugc-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    for (let i = 0; i < Math.min(productImages.length, 3); i++) {
      const imgUrl = productImages[i];
      if (!imgUrl || !imgUrl.startsWith('http')) continue;

      try {
        const ext = imgUrl.endsWith('.png') ? 'png' : 'jpg';
        const localDest = path.join(cacheDir, `prod-${Date.now()}-${i}.${ext}`);
        await downloadAsset(imgUrl, localDest);
        if (fs.existsSync(localDest) && fs.statSync(localDest).size > 1000) {
          assets.push({
            type: 'productImage',
            url: imgUrl,
            localPath: localDest,
            keyword: `product-${i}`,
          });
          break; // One valid product image badge is great
        }
      } catch {
        // Skip invalid product images safely
      }
    }
  }

  return assets;
}

export async function downloadAsset(url: string, outputPath: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 7000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  await fs.promises.writeFile(outputPath, Buffer.from(response.data));
  return outputPath;
}
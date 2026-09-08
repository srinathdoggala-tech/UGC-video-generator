import * as cheerio from 'cheerio';
import axios from 'axios';

export async function extractProductInfo(url: string): Promise<{
  title: string;
  description: string;
  images: string[];
  metadata: Record<string, string>;
}> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const metadata: Record<string, string> = {};
    
    $('meta').each((_, el) => {
      const $el = $(el);
      const property = $el.attr('property') || $el.attr('name');
      const content = $el.attr('content');
      if (property && content) {
        metadata[property] = content;
      }
    });

    const title = 
      metadata['og:title'] || 
      metadata['twitter:title'] || 
      $('title').text() || 
      $('h1').first().text() || 
      'Unknown Product';

    const description = 
      metadata['og:description'] || 
      metadata['twitter:description'] || 
      metadata['description'] || 
      $('meta[name="description"]').attr('content') || 
      $('p').first().text() || 
      '';

    const images: string[] = [];
    
    if (metadata['og:image']) {
      images.push(metadata['og:image']);
    }
    if (metadata['twitter:image']) {
      images.push(metadata['twitter:image']);
    }
    
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.startsWith('data:') && src.length > 10) {
        try {
          const absoluteUrl = new URL(src, url).href;
          if (!images.includes(absoluteUrl)) {
            images.push(absoluteUrl);
          }
        } catch {
          // Invalid URL, skip
        }
      }
    });

    return {
      title: title.trim(),
      description: description.trim().slice(0, 500),
      images: images.slice(0, 10),
      metadata,
    };
  } catch (error) {
    console.error('Product extraction error:', error);
    throw new Error(`Failed to extract product info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function isValidProductUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
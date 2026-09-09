import { NextRequest, NextResponse } from 'next/server';
import { extractProductInfo, isValidProductUrl } from '@/lib/product-extraction';
import { generateVideoPlan } from '@/lib/ai-organization';
import { selectAssets } from '@/lib/asset-selection';
import { renderVideo } from '@/lib/video-renderer';
import { ProductInfo } from '@/lib/types';
import { logAgentEvent } from '@/lib/agent-logger';

function extractProductUrl(text: string): string | null {
  // Check for http/https URL
  const httpMatch = text.match(/https?:\/\/[^\s]+/i);
  if (httpMatch) {
    return httpMatch[0].replace(/[.,;!?)]+$/, '');
  }

  // Check for bare domain patterns like calai.app or www.calai.app
  const domainMatch = text.match(/\b(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)\b/i);
  if (domainMatch) {
    const raw = domainMatch[0].replace(/[.,;!?)]+$/, '');
    return `https://${raw}`;
  }

  return null;
}

function handleConversationalMessage(message: string): string {
  const lower = message.trim().toLowerCase();

  // Test A: Greetings
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'sup', 'yo', 'good morning', 'good afternoon', 'good evening'];
  if (greetings.some(g => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!'))) {
    return "Send any product URL to generate a short-form UGC edit.";
  }

  // Test B: Capabilities
  if (
    lower.includes('what can you do') ||
    lower.includes('what do you do') ||
    lower.includes('how does this work') ||
    lower.includes('help') ||
    lower.includes('who are you')
  ) {
    return "Provide a product link (e.g. https://resend.com). The engine extracts core features, structures narrative hooks, pairs matched visuals and audio, and compiles a 9:16 short-form video edit.";
  }

  // General conversation fallback
  return "Send a product URL to generate a short-form video edit.";
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const detectedUrl = extractProductUrl(message);

    // If no product URL is present, handle as normal assistant conversation (NO rendering)
    if (!detectedUrl) {
      const conversationalResponse = handleConversationalMessage(message);
      logAgentEvent('chat_conversation', { message, response: conversationalResponse });
      return NextResponse.json({
        response: conversationalResponse,
        videoUrl: null,
      });
    }

    if (!isValidProductUrl(detectedUrl)) {
      return NextResponse.json({
        response: "Please send a valid product URL.",
        videoUrl: null,
      });
    }

    // Step 1: Product Extraction
    console.log('[video] extracting product');
    logAgentEvent('stage_extracting_product', { url: detectedUrl });

    let productInfo: ProductInfo;
    try {
      const extractedInfo = await extractProductInfo(detectedUrl);
      productInfo = {
        url: detectedUrl,
        ...extractedInfo,
      };
    } catch (extractErr) {
      console.error('[video] product extraction failed:', extractErr instanceof Error ? extractErr.message : extractErr);
      return NextResponse.json({
        response: "I couldn't access that product page. Try another product URL.",
        videoUrl: null,
      });
    }

    // Step 2: AI Organization
    console.log('[video] organizing assets');
    logAgentEvent('stage_organizing_assets', { productTitle: productInfo.title });
    const plan = await generateVideoPlan(productInfo);

    // Step 3: Asset Selection & Download
    console.log('[video] downloading assets');
    logAgentEvent('stage_downloading_assets', { hook: plan.video.hook });
    const assets = await selectAssets(plan, productInfo.images);

    // Step 4: Video Rendering
    console.log('[video] rendering');
    logAgentEvent('stage_rendering', { duration: plan.video.duration });
    const result = await renderVideo(plan, assets, productInfo);

    // Step 5: Output Verification
    console.log('[video] verifying output');
    logAgentEvent('stage_verifying_output', { videoUrl: result.videoUrl, localPath: result.localPath });

    // Step 6: Completed
    console.log('[video] completed');
    logAgentEvent('stage_completed', { videoUrl: result.videoUrl });

    return NextResponse.json({
      response: `Generated 9:16 video edit for "${productInfo.title}".`,
      videoUrl: result.videoUrl,
      productTitle: productInfo.title,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    logAgentEvent('chat_error', { error: error instanceof Error ? error.message : 'Unknown' });

    if (error instanceof Error && error.message.includes('Failed to extract')) {
      return NextResponse.json({
        response: "I couldn't access that product page. Try another product URL.",
        videoUrl: null,
      });
    }

    return NextResponse.json({
      response: "I couldn't finish the video this time. Please try again.",
      videoUrl: null,
    });
  }
}
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
  const text = message.trim().toLowerCase();
  // Normalize common slang/abbreviations
  const normalized = text
    .replace(/\bwat\b/g, 'what')
    .replace(/\bu\b/g, 'you')
    .replace(/\bur\b/g, 'your')
    .replace(/\bpls\b/g, 'please')
    .replace(/[?!.,;:]+$/g, '');

  // 1. GREETING Intent
  const greetingPatterns = [
    /^(hi|hello|hey|heyy+|howdy|sup|yo|greetings)\b/i,
    /^(good\s+(morning|afternoon|evening|day))\b/i,
    /^(hey\s+there|hi\s+there|hello\s+there)\b/i,
  ];
  if (greetingPatterns.some(pattern => pattern.test(normalized))) {
    return "Hey — I'm UGC / Studio. Send me a product URL and I'll turn it into a short-form UGC edit.";
  }

  // 2. CAPABILITY Intent (handles "what can you do", "wat can you do for me", "how does this work", etc.)
  const capabilityPatterns = [
    /what\s+can\s+you\s+do/i,
    /what\s+do\s+you\s+(do|make|build|create)/i,
    /how\s+does\s+(this|it)\s+work/i,
    /tell\s+me\s+what\s+you\s+can\s+do/i,
    /what\s+is\s+this/i,
    /who\s+are\s+you/i,
    /^(help|capabilities|features|instructions)\b/i,
  ];
  if (capabilityPatterns.some(pattern => pattern.test(normalized))) {
    return "I turn product pages into short-form UGC edits. Send me a product URL and I'll pull the useful product context, select matching creative assets, and compose a finished 9:16 video.";
  }

  // 3. NON-URL VIDEO GENERATION REQUEST (e.g. "make me a video", "create a video")
  const creationWithoutUrlPatterns = [
    /(make|create|generate|build|render)\s+(me\s+)?(a\s+)?(video|edit|ugc)/i,
    /^(video|create\s+video|generate\s+video|make\s+video)$/i,
  ];
  if (creationWithoutUrlPatterns.some(pattern => pattern.test(normalized))) {
    return "I'd be happy to create a video — please share a product URL (e.g. https://resend.com or https://linear.app) to get started.";
  }

  // 4. GRATITUDE / ACKNOWLEDGEMENT Intent
  const gratitudePatterns = [
    /^(thanks|thank\s+you|thx|awesome|cool|great|nice|perfect|got\s+it|ok|okay)\b/i,
  ];
  if (gratitudePatterns.some(pattern => pattern.test(normalized))) {
    return "Glad to help! Drop in any product URL whenever you're ready to create an edit.";
  }

  // 5. GENERAL_CONVERSATION Fallback
  return "I'm ready to create your short-form UGC edit. Send over any product URL to get started.";
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
export interface ProductInfo {
  url: string;
  title: string;
  description: string;
  images: string[];
  metadata: Record<string, string>;
}

export interface VideoPlan {
  product: {
    name: string;
    description: string;
    audience: string;
    keyBenefits: string[];
  };
  video: {
    hook: string;
    scenes: Scene[];
    tone: string;
    duration: number;
    assetKeywords: string[];
  };
}

export interface Scene {
  id: string;
  text: string;
  duration: number;
  backgroundKeyword: string;
  gifKeyword?: string;
  productImageIndex?: number;
}

export interface Asset {
  type: 'background' | 'gif' | 'audio' | 'productImage';
  url: string;
  localPath?: string;
  keyword: string;
}

export interface VideoRenderRequest {
  plan: VideoPlan;
  assets: Asset[];
  productInfo: ProductInfo;
}

export interface VideoRenderResult {
  videoUrl: string;
  localPath: string;
  duration: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  videoUrl?: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}
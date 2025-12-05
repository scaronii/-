export type Role = 'user' | 'model';

export interface Message {
  id: string;
  role: Role;
  text: string;
  isError?: boolean;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  modelId: string;
  systemInstruction?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'OpenAI' | 'Google' | 'Anthropic' | 'DeepSeek' | 'xAI' | 'Moonshot' | 'Recraft' | 'Flux';
  type: 'text' | 'image';
  isNew?: boolean;
  description?: string;
  maxTokens?: number;
  geminiMap?: string; // Internal mapping to actual working Gemini model for demo purposes
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  tokens: number;
  words: number;
  images: number;
  features: string[];
  isPopular?: boolean;
  isPro?: boolean;
  invoicePayload?: string; // Payload for Telegram Invoice
}

export type ViewState = 'chat' | 'images' | 'pricing' | 'docs';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
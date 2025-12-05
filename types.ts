
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
  geminiMap?: string; 
  cost: number; // Cost in Stars
}

export interface CreditPack {
  id: string;
  name: string;
  stars: number;
  price: number; // Price in XTR
  bonus?: string;
  isPopular?: boolean;
}

export type ViewState = 'chat' | 'images' | 'pricing' | 'docs';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

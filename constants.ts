
import { AIModel, CreditPack } from './types';

export const TEXT_MODELS: AIModel[] = [
  // OpenAI GPT-5 Series
  { 
    id: 'openai/gpt-5-nano', 
    name: 'OpenAI GPT-5 Nano', 
    provider: 'OpenAI', 
    type: 'text', 
    cost: 1 
  },
  { 
    id: 'openai/gpt-5', 
    name: 'OpenAI GPT-5', 
    provider: 'OpenAI', 
    type: 'text', 
    isNew: true,
    cost: 10 
  },
  { 
    id: 'openai/gpt-5.1', 
    name: 'OpenAI GPT-5.1', 
    provider: 'OpenAI', 
    type: 'text', 
    isNew: true,
    cost: 15 
  },

  // Google Gemini Series
  { 
    id: 'google/gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    provider: 'Google', 
    type: 'text', 
    cost: 1 
  },
  { 
    id: 'google/gemini-2.5-pro', 
    name: 'Gemini 2.5 Pro', 
    provider: 'Google', 
    type: 'text', 
    cost: 10 
  },
  { 
    id: 'google/gemini-3-pro-preview', 
    name: 'Gemini 3 Pro Preview', 
    provider: 'Google', 
    type: 'text', 
    isNew: true,
    cost: 15 
  },

  // Anthropic
  { 
    id: 'anthropic/claude-haiku-4.5', 
    name: 'Claude 4.5 Haiku', 
    provider: 'Anthropic', 
    type: 'text', 
    cost: 1 
  },

  // DeepSeek
  { 
    id: 'deepseek/deepseek-r1-0528', 
    name: 'DeepSeek R1', 
    provider: 'DeepSeek', 
    type: 'text', 
    cost: 10 
  },
  { 
    id: 'deepseek/deepseek-chat', 
    name: 'DeepSeek V3', 
    provider: 'DeepSeek', 
    type: 'text', 
    cost: 5 
  },

  // Moonshot
  { 
    id: 'moonshotai/kimi-k2-thinking', 
    name: 'Moonshot Kimi K2', 
    provider: 'Moonshot', 
    type: 'text', 
    cost: 8 
  },

  // xAI Grok
  { 
    id: 'x-ai/grok-4', 
    name: 'xAI Grok 4', 
    provider: 'xAI', 
    type: 'text', 
    cost: 10 
  },
  { 
    id: 'x-ai/grok-4-fast', 
    name: 'xAI Grok 4 Fast', 
    provider: 'xAI', 
    type: 'text', 
    cost: 2 
  },
];

export const IMAGE_MODELS: AIModel[] = [
  // Google Nano Banana Series (NEW)
  { 
    id: 'google/gemini-2.5-flash-image', 
    name: 'Nano Banana', 
    provider: 'Google', 
    type: 'image', 
    description: 'Gemini 2.5 Flash Image', 
    isNew: true,
    cost: 5 
  },
  { 
    id: 'google/gemini-3-pro-image-preview', 
    name: 'Nano Banana Pro', 
    provider: 'Google', 
    type: 'image', 
    description: 'Gemini 3 Pro Image', 
    isNew: true,
    cost: 15 
  },

  // Flux Series (Top Tier on OpenRouter)
  { 
    id: 'black-forest-labs/flux-1.1-pro', 
    name: 'FLUX 1.1 Pro', 
    provider: 'Flux', 
    type: 'image', 
    description: 'Фотореализм (Top Tier)', 
    cost: 40 
  },
  { 
    id: 'black-forest-labs/flux-1-schnell', 
    name: 'FLUX Schnell', 
    provider: 'Flux', 
    type: 'image', 
    description: 'Быстрая генерация', 
    cost: 10 
  },

  // Recraft
  { 
    id: 'recraft-ai/recraft-v3', 
    name: 'Recraft V3', 
    provider: 'Recraft', 
    type: 'image', 
    description: 'Вектор и дизайн', 
    cost: 30 
  },

  // OpenAI
  { 
    id: 'openai/dall-e-3', 
    name: 'DALL-E 3', 
    provider: 'OpenAI', 
    type: 'image', 
    description: 'Точное следование промпту', 
    cost: 60 
  },

  // Others
  { 
    id: 'ideogram/ideogram-v2', 
    name: 'Ideogram V2', 
    provider: 'Ideogram', 
    type: 'image', 
    description: 'Типографика и текст', 
    cost: 25 
  },
];

export const VIDEO_MODELS: AIModel[] = [
  { id: 'sora-2', name: 'Sora 2', provider: 'OpenAI', type: 'video', description: 'Быстрая генерация видео', cost: 35 }, 
  { id: 'sora-2-pro', name: 'Sora 2 Pro', provider: 'OpenAI', type: 'video', isNew: true, description: 'Кинематографическое качество', cost: 100 },
];

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_small',
    name: 'Старт',
    stars: 50,
    price: 50,
    bonus: ''
  },
  {
    id: 'pack_medium',
    name: 'Стандарт',
    stars: 250,
    price: 250,
    bonus: '+25 ★ бонус',
    isPopular: true
  },
  {
    id: 'pack_large',
    name: 'Профи',
    stars: 1000,
    price: 1000,
    bonus: '+150 ★ бонус'
  },
  {
    id: 'pack_whale',
    name: 'Бизнес',
    stars: 5000,
    price: 5000,
    bonus: '+1000 ★ бонус'
  }
];

export const FAQ_ITEMS = [
  { q: 'Как работает оплата?', a: 'Вы покупаете Звезды (Stars). Простые модели стоят 1 звезду за сообщение, мощные (Pro) — 10-15 звезд. Генерация видео — от 140 звезд.' },
  { q: 'Есть ли бесплатный доступ?', a: 'Да! Первые 10 сообщений с простыми моделями абсолютно бесплатны.' },
  { q: 'Что такое Telegram Stars?', a: 'Это официальная валюта Telegram. Ее можно купить через банковскую карту внутри мессенджера.' },
  { q: 'Нужен ли VPN?', a: 'Нет, сервис работает через единый шлюз OpenRouter, доступный из РФ без VPN.' },
];

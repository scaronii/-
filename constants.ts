

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
  { 
    id: 'google/gemini-2.5-flash-image-preview', 
    name: 'Gemini 2.5 Image', 
    provider: 'Google', 
    type: 'image', 
    description: 'Быстрая и точная генерация от Google', 
    cost: 0 
  },
  { 
    id: 'google/gemini-3-pro-image-preview', 
    name: 'Nano Banana Pro', 
    provider: 'Google', 
    type: 'image', 
    description: 'Gemini 3 Pro Image Preview', 
    cost: 25,
    isNew: true
  },
  { 
    id: 'openai/gpt-5-image-mini', 
    name: 'GPT-5 Image Mini', 
    provider: 'OpenAI', 
    type: 'image', 
    description: 'Быстрая генерация от OpenAI', 
    cost: 15,
    isNew: true
  },
  { 
    id: 'openai/gpt-5-image', 
    name: 'GPT-5 Image', 
    provider: 'OpenAI', 
    type: 'image', 
    description: 'Флагманская модель OpenAI', 
    cost: 40,
    isNew: true
  },
  { 
    id: 'black-forest-labs/flux.2-flex', 
    name: 'FLUX.2 Flex', 
    provider: 'Flux', 
    type: 'image', 
    description: 'Гибкая модель нового поколения', 
    cost: 20,
    isNew: true
  },
  { 
    id: 'black-forest-labs/flux.2-pro', 
    name: 'Flux 2 Pro', 
    provider: 'Flux', 
    type: 'image', 
    description: 'Новейшая модель Flux (SOTA)', 
    cost: 60
  },
  { 
    id: 'sourceful/riverflow-v2-max-preview', 
    name: 'Riverflow V2 Max', 
    provider: 'Sourceful', 
    type: 'image', 
    description: 'Реалистичность нового уровня', 
    cost: 45,
    isNew: true
  }
];

export const VIDEO_MODELS: AIModel[] = [
  { 
    id: 'sora-2', 
    name: 'OpenAI Sora 2', 
    provider: 'OpenAI', 
    type: 'video', 
    description: 'Кинематографическое качество', 
    cost: 35, // Per second
    geminiMap: 'video-01' // Mapped internally
  }, 
  { 
    id: 'google-veo', 
    name: 'Google Veo', 
    provider: 'Google', 
    type: 'video', 
    isNew: true, 
    description: 'Быстрая генерация движения', 
    cost: 25,
    geminiMap: 'video-01'
  },
  { 
    id: 'hailuo-02', 
    name: 'Hailuo MiniMax 02', 
    provider: 'ByteDance', 
    type: 'video', 
    isNew: true, 
    description: 'Ultra HD 1080p, 60fps', 
    cost: 30,
    geminiMap: 'video-01' 
  },
];

export const MUSIC_MODELS: AIModel[] = [
  { 
    id: 'music-2.0', 
    name: 'MiniMax Music 2.0', 
    provider: 'MiniMax', 
    type: 'audio', 
    description: 'Генерация песен с вокалом (High Fidelity)', 
    cost: 50,
    geminiMap: 'music-2.0' // Маппинг на реальный ID модели
  }
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
  { q: 'Есть ли бесплатный доступ?', a: 'Да! Первые 10 сообщений с простыми моделями абсолютно бесплатны, также доступна бесплатная генерация изображений через Gemini.' },
  { q: 'Что такое Telegram Stars?', a: 'Это официальная валюта Telegram. Ее можно купить через банковскую карту внутри мессенджера.' },
  { q: 'Нужен ли VPN?', a: 'Нет, сервис работает через единый шлюз OpenRouter, доступный из РФ без VPN.' },
];

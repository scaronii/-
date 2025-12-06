
import { AIModel, CreditPack } from './types';

export const TEXT_MODELS: AIModel[] = [
  // Fast Models (mapped to GPT-4o-mini)
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', type: 'text', cost: 1 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', type: 'text', cost: 1 },
  { id: 'gpt-4.1', name: 'GPT-4.1 Turbo', provider: 'OpenAI', type: 'text', cost: 1 },
  { id: 'claude-4.5-haiku', name: 'Claude 4.5 Haiku', provider: 'Anthropic', type: 'text', cost: 1 },
  { id: 'grok-4', name: 'Grok 4', provider: 'xAI', type: 'text', cost: 1 },
  
  // Pro Models (mapped to GPT-4o)
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', type: 'text', isNew: true, cost: 10 },
  { id: 'gemini-3-pro', name: 'Gemini 3.0 Pro', provider: 'Google', type: 'text', isNew: true, cost: 10 },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', type: 'text', cost: 10 },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', type: 'text', cost: 10 },
];

export const IMAGE_MODELS: AIModel[] = [
  // Image Models (mapped to DALL-E 3)
  { id: 'nano-banana', name: 'Nano Banana', provider: 'Google', type: 'image', description: 'Базовая версия', cost: 50 },
  { id: 'imagen-4', name: 'Imagen 4 Fast', provider: 'Google', type: 'image', description: 'Быстрая генерация', cost: 50 },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Google', type: 'image', isNew: true, description: 'Премиум качество HD', cost: 100 },
  { id: 'recraft-v3', name: 'Recraft V3', provider: 'Recraft', type: 'image', description: 'Векторная графика', cost: 100 },
  { id: 'flux-1.1', name: 'FLUX 1.1 Pro', provider: 'Flux', type: 'image', description: 'Фотореализм', cost: 100 },
];

export const VIDEO_MODELS: AIModel[] = [
  { id: 'sora-2', name: 'Sora 2', provider: 'OpenAI', type: 'video', description: 'Быстрая генерация видео', cost: 100 }, // Price doubled (50 -> 100)
  { id: 'sora-2-pro', name: 'Sora 2 Pro', provider: 'OpenAI', type: 'video', isNew: true, description: 'Кинематографическое качество', cost: 300 }, // Price doubled (150 -> 300)
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
  { q: 'Как работает оплата?', a: 'Вы покупаете Звезды (Stars). Простые модели стоят 1 звезду за сообщение, мощные (Pro) — 10 звезд. Генерация видео — от 100 звезд.' },
  { q: 'Есть ли бесплатный доступ?', a: 'Да! Первые 10 сообщений с простыми моделями (Nano, Flash) абсолютно бесплатны.' },
  { q: 'Что такое Telegram Stars?', a: 'Это официальная валюта Telegram. Ее можно купить через банковскую карту внутри мессенджера.' },
  { q: 'Сгорают ли звезды?', a: 'Нет, купленные звезды остаются на балансе навсегда.' },
];

import { AIModel, PricingPlan } from './types';

export const TEXT_MODELS: AIModel[] = [
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', type: 'text', geminiMap: 'gemini-2.5-flash' },
  { id: 'gpt-4.1', name: 'GPT-4.1 Turbo', provider: 'OpenAI', type: 'text', geminiMap: 'gemini-2.5-flash' },
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', type: 'text', isNew: true, geminiMap: 'gemini-3-pro-preview' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', type: 'text', geminiMap: 'gemini-2.5-flash' },
  { id: 'gemini-3-pro', name: 'Gemini 3.0 Pro', provider: 'Google', type: 'text', isNew: true, geminiMap: 'gemini-3-pro-preview' },
  { id: 'claude-4.5-haiku', name: 'Claude 4.5 Haiku', provider: 'Anthropic', type: 'text', geminiMap: 'gemini-2.5-flash' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', type: 'text', geminiMap: 'gemini-3-pro-preview' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', type: 'text', geminiMap: 'gemini-3-pro-preview' },
  { id: 'grok-4', name: 'Grok 4', provider: 'xAI', type: 'text', geminiMap: 'gemini-2.5-flash' },
];

export const IMAGE_MODELS: AIModel[] = [
  { id: 'nano-banana', name: 'Nano Banana', provider: 'Google', type: 'image', description: 'Базовая версия с редактированием', geminiMap: 'gemini-2.5-flash-image' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', provider: 'Google', type: 'image', isNew: true, description: 'Премиум качество, до 4K', geminiMap: 'gemini-3-pro-image-preview' },
  { id: 'imagen-4', name: 'Imagen 4 Fast', provider: 'Google', type: 'image', description: 'Быстрая генерация', geminiMap: 'gemini-2.5-flash-image' },
  { id: 'gpt-image-1', name: 'GPT Image-1', provider: 'OpenAI', type: 'image', description: 'Мультимодальная' },
  { id: 'recraft-v3', name: 'Recraft V3', provider: 'Recraft', type: 'image', description: 'Векторная графика' },
  { id: 'flux-1.1', name: 'FLUX 1.1 Pro', provider: 'Flux', type: 'image', description: 'Фотореализм' },
];

export const PLANS: PricingPlan[] = [
  {
    id: 'trial',
    name: 'Пробный',
    price: 250,
    period: 'month',
    tokens: 50000,
    words: 2000,
    images: 10,
    features: ['Все текстовые модели', 'История чатов', 'Техподдержка'],
  },
  {
    id: 'standard',
    name: 'Стандартный',
    price: 490,
    period: 'month',
    tokens: 150000,
    words: 6000,
    images: 30,
    features: ['Все функции', 'Быстрые ответы', 'Без VPN'],
  },
  {
    id: 'optimal',
    name: 'Оптимальный',
    price: 1490,
    period: 'month',
    tokens: 500000,
    words: 20000,
    images: 100,
    features: ['Все функции', 'Приоритет в очереди', 'Поддержка 24/7'],
    isPopular: true,
  },
  {
    id: 'pro',
    name: 'Профессиональный',
    price: 2990,
    period: 'month',
    tokens: 1500000,
    words: 60000,
    images: 300,
    features: ['Все функции', 'API доступ', 'Персональный менеджер'],
    isPro: true,
  },
];

export const FAQ_ITEMS = [
  { q: 'Нужен ли VPN?', a: 'Нет, наш сервис работает в России без VPN. Мы выступаем официальным агрегатором.' },
  { q: 'Как считаются токены?', a: '1 токен ≈ 0.75 слова. Генерация изображений стоит от 5000 токенов.' },
  { q: 'Можно ли сменить тариф?', a: 'Да, вы можете сменить тариф в любой момент. Неиспользованные токены переносятся.' },
];

import OpenAI from "openai";
import { TEXT_MODELS } from '../constants';

// Initialize OpenAI client pointing to our OpenRouter Proxy
const openai = new OpenAI({
  apiKey: "dummy", // Key is injected by the proxy for security
  baseURL: typeof window !== 'undefined' ? `${window.location.origin}/openai-api/v1` : undefined,
  dangerouslyAllowBrowser: true 
});

// Debug utility to fetch all available OpenRouter models
if (typeof window !== 'undefined') {
  (window as any).logAvailableModels = async () => {
    try {
      const response = await fetch(`${window.location.origin}/openai-api/v1/models`);
      const data = await response.json();
      console.log("=== Available OpenRouter Models ===");
      console.table(data.data.map((m: any) => ({ id: m.id, name: m.name, pricing: m.pricing })));
      return data;
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  };
}

interface StreamChatOptions {
  modelId: string;
  history: { role: string; parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] }[];
  message: string;
  attachment?: { mimeType: string; data: string } | null;
  useSearch?: boolean;
  systemInstruction?: string;
  onChunk: (text: string) => void;
}

export const streamChatResponse = async ({
  modelId,
  history,
  message,
  attachment,
  useSearch,
  systemInstruction,
  onChunk
}: StreamChatOptions) => {
  
  const selectedModelDef = TEXT_MODELS.find(m => m.id === modelId);
  const targetModel = selectedModelDef ? selectedModelDef.id : 'google/gemini-2.0-flash-001';

  const messages: any[] = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  for (const turn of history) {
    const role = turn.role === 'model' ? 'assistant' : 'user';
    let content: any = null;
    
    const imagePart = turn.parts.find(p => 'inlineData' in p);
    const textPart = turn.parts.find(p => 'text' in p);

    if (imagePart && 'inlineData' in imagePart) {
        content = [
            { type: "text", text: ('text' in textPart! ? textPart.text : "") },
            { 
              type: "image_url", 
              image_url: { 
                  url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` 
              } 
            }
        ];
    } else if (textPart && 'text' in textPart) {
        content = textPart.text;
    }
    
    if (content) {
        messages.push({ role, content });
    }
  }

  const currentContent: any[] = [];
  if (message) {
      currentContent.push({ type: "text", text: message });
  }
  if (attachment) {
      currentContent.push({ 
          type: "image_url", 
          image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` 
      } 
      });
  }

  if (currentContent.length > 0) {
      messages.push({ role: 'user', content: currentContent });
  }

  try {
    const stream = await openai.chat.completions.create({
        model: targetModel,
        messages: messages,
        stream: true,
        max_tokens: 4096,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
            onChunk(content);
        }
    }

  } catch (error: any) {
    console.error("OpenRouter Chat Error:", error);
    throw new Error(error.message || "Ошибка соединения с OpenRouter");
  }
};

export const generateImage = async (
  modelId: string,
  prompt: string,
  aspectRatio: string = "1:1",
  attachment?: { mimeType: string; data: string } | null
): Promise<{ url: string | null, mimeType?: string }> => {
  
  try {
    let content: any;

    // СТРАТЕГИЯ 1: Если есть картинка-референс (Vision Remix)
    if (attachment) {
      // Для Vision моделей контент должен быть массивом
      content = [
        { 
          type: "text", 
          text: (prompt || "Generate an image") + ` (Aspect Ratio: ${aspectRatio})` 
        },
        {
          type: "image_url",
          image_url: {
            // attachment.data уже должен быть base64 строкой (ASCII), это безопасно
            url: `data:${attachment.mimeType};base64,${attachment.data}`
          }
        }
      ];
    } else {
      // СТРАТЕГИЯ 2: Только текст
      // OpenRouter рекомендует отправлять просто строку, если нет картинок
      content = (prompt || "Generate an image") + ` (Aspect Ratio: ${aspectRatio})`;
    }

    const payload: any = {
      model: modelId,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
      // ВАЖНО: Согласно документации OpenRouter, этот параметр обязателен для генерации
      modalities: ['image', 'text'],
    };

    // Для Gemini добавляем специальный конфиг, но оставляем размер и в промпте для надежности
    if (modelId.includes('gemini')) {
        payload.image_config = { aspect_ratio: aspectRatio };
    }

    // Логируем, чтобы вы видели, что уходит на сервер
    console.log("Sending Image Request Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch('/openai-api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization' добавляется в proxy.ts, здесь не нужен
      },
      // JSON.stringify безопасно кодирует Unicode (русский текст) в \uXXXX
      // Это предотвращает ошибку "string did not match the expected pattern"
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Image Gen API Error:", errorText);
        throw new Error(`Ошибка API (${response.status}): ${errorText.slice(0, 100)}`);
    }

    const data = await response.json();
    console.log("OpenRouter Image Response:", data);

    // === ПОИСК КАРТИНКИ В ОТВЕТЕ ===

    const choice = data.choices?.[0];
    const message = choice?.message;
    
    // 1. Стандартный формат (поле images)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        const img = message.images[0];
        const url = img.image_url?.url || img.url;
        if (url) return { url, mimeType: "image/png" };
    }

    // 2. Поиск в тексте ответа (Markdown ссылка) - часто бывает у Flux/Recraft
    const textContent = message?.content || "";
    const markdownMatch = textContent.match(/\!\[.*?\]\((.*?)\)/);
    if (markdownMatch && markdownMatch[1]) {
        return { url: markdownMatch[1], mimeType: "image/png" };
    }
    
    // 3. Поиск прямой ссылки в тексте
    const urlMatch = textContent.match(/(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|webp))/i);
    if (urlMatch && urlMatch[1]) {
         return { url: urlMatch[1], mimeType: "image/png" };
    }

    // 4. Старый формат OpenAI
    if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
        return { url: data.data[0].url, mimeType: "image/png" };
    }

    throw new Error("Картинка не найдена в ответе API.");

  } catch (error: any) {
    console.error("Generate Image Critical Error:", error);
    // Проверка на ту самую ошибку
    if (error.name === 'InvalidCharacterError' || error.message.includes('match the expected pattern')) {
        throw new Error("Критическая ошибка кодировки. Проверьте прокси или браузер.");
    }
    throw new Error(error.message || "Не удалось создать изображение");
  }
};

export const generateVideo = async (
  modelId: string,
  prompt: string,
  size: string = "1280x720",
  seconds: 4 | 8 | 12 = 8, 
  attachment?: { mimeType: string; data: string } | null
) => {
  console.log("Starting Video Gen (Simulated/Mock via Proxy):", { modelId, prompt, size, seconds });
  await new Promise(r => setTimeout(r, 1500));
  
  return {
      id: "mock_video_" + Date.now(),
      status: "queued",
      mock: true
  };
};

export const pollVideoStatus = async (videoId: string): Promise<any> => {
   if (videoId.startsWith('mock_')) {
      const isComplete = Math.random() > 0.7; 
      
      if (isComplete) {
          return {
              id: videoId,
              status: 'completed',
              progress: 100,
              mock: true
          };
      }
      return {
          id: videoId,
          status: 'in_progress',
          progress: Math.floor(Math.random() * 80) + 10,
          mock: true
      };
   }
   throw new Error("Video API not connected");
};

export const getVideoContent = async (videoId: string): Promise<string> => {
   return "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4"; 
};

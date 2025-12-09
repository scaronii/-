
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
    const payload: any = {
      model: modelId,
      messages: [
        {
          role: 'user',
          content: prompt || "Generate an image",
        },
      ],
      // Обязательный параметр для OpenRouter Image Gen
      modalities: ['image', 'text'],
    };

    // Добавляем image_config только для моделей Gemini, другие могут упасть с ошибкой
    if (modelId.includes('gemini')) {
        payload.image_config = { aspect_ratio: aspectRatio };
    } else {
        // Для Flux/Recraft добавляем размер в промпт, так как они не всегда поддерживают image_config
        payload.messages[0].content += ` (Aspect Ratio: ${aspectRatio})`;
    }

    console.log("Sending Image Request:", payload);

    const response = await fetch('/openai-api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Image Gen API Error:", errorText);
        throw new Error(`Ошибка API (${response.status}): ${errorText.slice(0, 100)}`);
    }

    const data = await response.json();
    console.log("OpenRouter Image Response:", data);

    // === СТРАТЕГИИ ПОИСКА КАРТИНКИ ===

    // 1. Стандарт OpenRouter (поле images в message)
    // Пример: data.choices[0].message.images[0].image_url.url
    const choice = data.choices?.[0];
    const message = choice?.message;
    
    // Проверяем массив images (base64 или url)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        const img = message.images[0];
        // Может быть image_url.url или просто url
        const url = img.image_url?.url || img.url;
        if (url) return { url, mimeType: "image/png" };
    }

    // 2. Поиск в тексте (Markdown)
    // Flux и Recraft часто возвращают ссылку просто в тексте ответа
    const content = message?.content || "";
    
    // Ищем ![alt](url)
    const markdownMatch = content.match(/\!\[.*?\]\((.*?)\)/);
    if (markdownMatch && markdownMatch[1]) {
        return { url: markdownMatch[1], mimeType: "image/png" };
    }
    
    // Ищем прямую ссылку (http...png/jpg)
    const urlMatch = content.match(/(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|webp))/i);
    if (urlMatch && urlMatch[1]) {
         return { url: urlMatch[1], mimeType: "image/png" };
    }

    // 3. Формат OpenAI (data.data[0].url) - на случай если OpenRouter смаршрутизировал на DALL-E
    if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
        return { url: data.data[0].url, mimeType: "image/png" };
    }

    console.error("Full Response Dump:", JSON.stringify(data, null, 2));
    throw new Error("Картинка не найдена в ответе. Проверьте консоль.");

  } catch (error: any) {
    console.error("Generate Image Error:", error);
    throw new Error(error.message || "Ошибка генерации изображения");
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

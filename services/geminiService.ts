
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
    
    const imagePart = turn.parts.find(p => 'inlineData' in p) as { inlineData: { mimeType: string; data: string } } | undefined;
    const textPart = turn.parts.find(p => 'text' in p) as { text: string } | undefined;

    if (imagePart) {
        content = [
            { type: "text", text: (textPart ? textPart.text : "") },
            { 
              type: "image_url", 
              image_url: {
                  url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
              }
            }
        ];
    } else if (textPart) {
        content = textPart.text;
    }
    
    if (content) {
        messages.push({ role, content });
    }
  }

  let currentContent: any = message;
  if (attachment) {
      currentContent = [
          { type: "text", text: message },
          {
              type: "image_url",
              image_url: {
                  url: `data:${attachment.mimeType};base64,${attachment.data}`
              }
          }
      ];
  }
  messages.push({ role: 'user', content: currentContent });

  if (useSearch) {
      messages.push({ role: 'system', content: "Use available search tools to provide up-to-date information." });
  }

  try {
      const stream = await openai.chat.completions.create({
        model: targetModel,
        messages: messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          onChunk(content);
        }
      }
  } catch (error) {
      console.error("Chat error:", error);
      throw error;
  }
};

export const generateImage = async (model: string, prompt: string, aspectRatio: string, attachment?: { mimeType: string; data: string }) => {
    try {
        // Формируем сообщение
        const messages: any[] = [
            { role: 'user', content: prompt }
        ];

        // Добавляем референс (attachment), если есть
        if (attachment) {
             messages[0].content = [
                { type: "text", text: prompt },
                {
                    type: "image_url",
                    image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` }
                }
             ];
        }

        // Вызов Chat API с параметром modalities (специфика OpenRouter)
        // Мы используем 'as any', чтобы обойти типизацию OpenAI SDK, которая не знает про 'modalities'
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
            // @ts-ignore - игнорируем ошибку типов для нестандартного параметра
            modalities: ["image", "text"], 
            image_config: {
                aspect_ratio: aspectRatio // Например '1:1', '16:9' (работает для Gemini моделей)
            }
        } as any);
        
        // Получаем ответ. В OpenRouter картинка приходит внутри message.images (расширение протокола)
        const choice = response.choices[0] as any;
        
        if (choice.message?.images && choice.message.images.length > 0) {
             return { url: choice.message.images[0].image_url.url }; // Base64 url
        } 
        
        // Фоллбэк: иногда модель может вернуть ссылку текстом
        if (choice.message?.content && choice.message.content.startsWith('http')) {
            return { url: choice.message.content };
        }

        console.error("No image in response:", response);
        throw new Error("API не вернуло изображение");

    } catch (e: any) {
        console.error("Generate image error:", e);
        throw new Error(e.message || "Failed to generate image");
    }
};

export const generateVideo = async (model: string, prompt: string, aspectRatio: string, duration: number, attachment?: { mimeType: string; data: string }) => {
    console.log("Generating video...", { model, prompt, aspectRatio, duration });
    // Mock async task
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { id: "vid-" + Math.random().toString(36).substring(2, 9) };
};

export const pollVideoStatus = async (id: string) => {
    // Mock polling
    await new Promise(resolve => setTimeout(resolve, 800));
    const isComplete = Math.random() > 0.4;
    return {
        status: isComplete ? 'completed' : 'processing',
        progress: isComplete ? 100 : Math.floor(Math.random() * 80)
    };
};

export const getVideoContent = async (id: string) => {
    // Mock video URL
    return "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4";
};

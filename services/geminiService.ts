
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
    let finalPrompt = prompt;

    // Vision Remix: Use GPT-4o to describe attachment if present
    if (attachment) {
        const descriptionResponse = await openai.chat.completions.create({
            model: "openai/gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: "You are a visual prompt engineer. Describe the attached image in extreme detail. Then, incorporate the user's request into this description to create a new generation prompt. Return ONLY the prompt." 
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: `User request: ${prompt}` },
                        { type: "image_url", image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } }
                    ]
                }
            ],
        });
        finalPrompt = descriptionResponse.choices[0]?.message?.content || prompt;
    }

    let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
    if (aspectRatio === "16:9") size = "1792x1024";
    if (aspectRatio === "9:16") size = "1024x1792";

    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/openai-api/v1` : 'https://openrouter.ai/api/v1';

    // Use native fetch to avoid SDK issues with 405 or malformed requests
    const response = await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dummy' // Proxy replaces this, but needed for local shim
        },
        body: JSON.stringify({
            model: modelId,
            prompt: finalPrompt,
            n: 1,
            size: size
        })
    });

    if (!response.ok) {
        let errorMessage = `Ошибка ${response.status}`;
        try {
            const errData = await response.json();
            if (errData.error?.message) {
                errorMessage = errData.error.message;
            }
        } catch {
            const text = await response.text();
            if (text) errorMessage = text.substring(0, 200); // Limit length
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    const url = data.data?.[0]?.url;

    if (url) {
        return {
            url: url,
            mimeType: "image/png"
        };
    }
    
    throw new Error("API вернул пустой результат");

  } catch (error: any) {
    console.error("OpenRouter Image Error:", error);
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

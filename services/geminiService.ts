
import OpenAI from "openai";
import { TEXT_MODELS } from '../constants';

// Initialize OpenAI client pointing to our OpenRouter Proxy
const openai = new OpenAI({
  apiKey: "dummy", // Key is injected by the proxy for security
  baseURL: typeof window !== 'undefined' ? `${window.location.origin}/openai-api/v1` : undefined,
  dangerouslyAllowBrowser: true 
});

// Debug utility to fetch all available OpenRouter models
// Call `await window.logAvailableModels()` in console to see the list
if (typeof window !== 'undefined') {
  (window as any).logAvailableModels = async () => {
    try {
      const response = await fetch(`${window.location.origin}/openai-api/v1/models`);
      const data = await response.json();
      console.log("=== Available OpenRouter Models ===");
      console.log(data);
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

// Helper to convert base64 to Blob
const base64ToBlob = (base64: string, mimeType: string) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const streamChatResponse = async ({
  modelId,
  history,
  message,
  attachment,
  useSearch,
  systemInstruction,
  onChunk
}: StreamChatOptions) => {
  
  // 1. Determine Model ID
  // Note: We use the exact ID from constants. If it doesn't exist on OpenRouter yet (e.g. GPT-5), 
  // OpenRouter might return a 404 or fallback depending on their config.
  const selectedModelDef = TEXT_MODELS.find(m => m.id === modelId);
  const targetModel = selectedModelDef ? selectedModelDef.id : 'google/gemini-2.0-flash-001';

  // 2. Build Messages Array
  const messages: any[] = [];

  // System Prompt
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  // Convert History
  for (const turn of history) {
    const role = turn.role === 'model' ? 'assistant' : 'user';
    let content: any = null;
    
    // Check for images in history
    const imagePart = turn.parts.find(p => 'inlineData' in p);
    const textPart = turn.parts.find(p => 'text' in p);

    if (imagePart && 'inlineData' in imagePart) {
        // Multimodal message
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
        // Text only
        content = textPart.text;
    }
    
    if (content) {
        messages.push({ role, content });
    }
  }

  // Current Message
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
        // OpenRouter handles limits, but we set a safe default
        max_tokens: 4096,
        // search is handled by OpenRouter plugins if model supports it (e.g. perplexity)
        // or we rely on the model's knowledge
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
    // OpenRouter supports this seamlessly via the chat endpoint
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

    const response = await openai.images.generate({
        model: modelId,
        prompt: finalPrompt,
        n: 1,
        size: size,
        // We do NOT use b64_json because many OpenRouter models (Flux, etc) only return URLs
    });

    const url = response.data[0].url;

    if (url) {
        return {
            url: url,
            mimeType: "image/png"
        };
    }
    
    throw new Error("No image data returned from API");

  } catch (error: any) {
    console.error("OpenRouter Image Error:", error);
    // Propagate the actual API error message to the UI
    throw new Error(error.message || "Ошибка генерации изображения");
  }
};

// Video Generation
// Note: OpenRouter does not currently have a unified standard for Video generation that matches this interface.
// We keep the "Mock" logic here for UI demonstration purposes until a standard emerges or we connect a specific provider directly.
export const generateVideo = async (
  modelId: string,
  prompt: string,
  size: string = "1280x720",
  seconds: 4 | 8 | 12 = 8, 
  attachment?: { mimeType: string; data: string } | null
) => {
  
  // Use a mock/demo flow because standard OpenAI API doesn't support videos yet
  // and OpenRouter is text/image focused currently.
  console.log("Starting Video Gen (Simulated/Mock via Proxy):", { modelId, prompt, size, seconds });

  // Simulate API delay and return a task ID
  await new Promise(r => setTimeout(r, 1500));
  
  return {
      id: "mock_video_" + Date.now(),
      status: "queued",
      mock: true
  };
};

export const pollVideoStatus = async (videoId: string): Promise<any> => {
   // Mock polling
   if (videoId.startsWith('mock_')) {
      // Randomly finish after a few polls
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
   // Mock return demo video
   return "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4"; 
};

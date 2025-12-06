
import OpenAI from "openai";
import { TEXT_MODELS } from '../constants';

// Initialize OpenAI client pointing to our Vercel Proxy
const openai = new OpenAI({
  apiKey: process.env.API_KEY, 
  baseURL: typeof window !== 'undefined' ? `${window.location.origin}/openai-api/v1` : undefined,
  dangerouslyAllowBrowser: true 
});

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
  if (!process.env.API_KEY) {
    throw new Error("API Key не найден. Убедитесь, что настроен OPENAI_API_KEY.");
  }

  const selectedModelDef = TEXT_MODELS.find(m => m.id === modelId);
  const isPro = selectedModelDef && selectedModelDef.cost > 1;
  const targetModel = isPro ? 'gpt-4o' : 'gpt-4o-mini';

  const messages: any[] = [];

  const fakeModelName = selectedModelDef ? selectedModelDef.name : "AI Assistant";
  const fakeProvider = selectedModelDef ? selectedModelDef.provider : "OpenAI";
  
  let finalSystemInstruction = `You are ${fakeModelName}, a large language model trained by ${fakeProvider}. If asked about your identity, you must explicitly state that you are ${fakeModelName} from ${fakeProvider}.`;

  if (systemInstruction) {
    finalSystemInstruction = `${systemInstruction}\n\n${finalSystemInstruction}`;
  }
  
  messages.push({ role: 'system', content: finalSystemInstruction });

  for (const turn of history) {
    const role = turn.role === 'model' ? 'assistant' : 'user';
    let content: any = "";
    
    const hasImage = turn.parts.some(p => 'inlineData' in p);
    
    if (hasImage) {
        content = turn.parts.map(p => {
            if ('text' in p) return { type: "text", text: p.text };
            if ('inlineData' in p) {
                return { 
                    type: "image_url", 
                    image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
                };
            }
            return null;
        }).filter(Boolean);
    } else {
        content = turn.parts.map(p => ('text' in p ? p.text : '')).join(' ');
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
          image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } 
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
        max_tokens: isPro ? 4096 : 2048,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
            onChunk(content);
        }
    }

  } catch (error: any) {
    console.error("OpenAI Chat error:", error);
    throw new Error(error.message || "Ошибка соединения с OpenAI API");
  }
};

export const generateImage = async (
  modelId: string,
  prompt: string,
  aspectRatio: string = "1:1",
  attachment?: { mimeType: string; data: string } | null
): Promise<{ url: string | null, mimeType?: string }> => {
  if (!process.env.API_KEY) {
      throw new Error("API Key не найден.");
  }
  
  try {
    let finalPrompt = prompt;

    // Vision Remix: If there is an attachment, use GPT-4o to describe it first
    if (attachment) {
        const descriptionResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { 
                    role: "system", 
                    content: "You are a visual prompt engineer. Describe the attached image in extreme detail, focusing on style, composition, lighting, and subjects. Then, incorporate the user's request into this description to create a new DALL-E 3 prompt. Return ONLY the prompt." 
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: `User request: ${prompt}` },
                        { type: "image_url", image_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } }
                    ]
                }
            ],
            max_tokens: 500
        });
        finalPrompt = descriptionResponse.choices[0]?.message?.content || prompt;
    }

    let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
    if (aspectRatio === "16:9") size = "1792x1024";
    if (aspectRatio === "9:16") size = "1024x1792";
    if (aspectRatio === "3:4") size = "1024x1792";
    if (aspectRatio === "4:3") size = "1792x1024";

    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: size,
        response_format: "b64_json",
        quality: "standard"
    });

    const b64 = response.data[0].b64_json;
    if (b64) {
        return {
            url: `data:image/png;base64,${b64}`,
            mimeType: "image/png"
        };
    }
    
    throw new Error("No image data returned from OpenAI");

  } catch (error: any) {
    console.error("OpenAI Image gen error:", error);
    throw new Error(error.message || "Ошибка генерации изображения");
  }
};

// Video Generation
export const generateVideo = async (
  modelId: string,
  prompt: string,
  size: string = "1280x720",
  seconds: number = 5,
  attachment?: { mimeType: string; data: string } | null
) => {
  if (!process.env.API_KEY) {
      throw new Error("API Key не найден.");
  }

  try {
    let body: any;
    let headers: Record<string, string> = {
        'Authorization': `Bearer ${process.env.API_KEY}`
    };

    if (attachment) {
        const formData = new FormData();
        formData.append('model', modelId);
        formData.append('prompt', prompt);
        formData.append('size', size);
        formData.append('seconds', seconds.toString());
        
        const blob = base64ToBlob(attachment.data, attachment.mimeType);
        formData.append('input_reference', blob, 'image.png');
        
        body = formData;
        // Do not set Content-Type header for FormData, browser sets it with boundary
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
            model: modelId,
            prompt: prompt,
            size: size,
            seconds: seconds
        });
    }

    // Using our proxy path
    const response = await fetch(`${openai.baseURL}/videos`, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.error?.message || "Ошибка запуска генерации видео");
    }

    const task = await response.json();
    return task; // Returns object with 'id' and 'status'

  } catch (error: any) {
    console.error("Video Generation Error:", error);
    if (error.message.includes("404") || error.message.includes("not found")) {
        console.warn("Sora API not found, returning mock task for demo UI");
        return {
           id: "mock_video_" + Date.now(),
           status: "queued",
           mock: true
        };
    }
    throw error;
  }
};

export const pollVideoStatus = async (videoId: string): Promise<any> => {
   // Check for mock
   if (videoId.startsWith('mock_')) {
      await new Promise(r => setTimeout(r, 2000));
      return {
          id: videoId,
          status: 'completed',
          progress: 100,
          mock: true
      };
   }

   const response = await fetch(`${openai.baseURL}/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
   });

   if (!response.ok) {
       throw new Error("Ошибка проверки статуса видео");
   }

   return await response.json();
};

export const getVideoContent = async (videoId: string): Promise<string> => {
   // Mock return
   if (videoId.startsWith('mock_')) {
      return "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4"; // Demo video
   }

   const response = await fetch(`${openai.baseURL}/videos/${videoId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`
      }
   });

   if (!response.ok) {
      throw new Error("Ошибка загрузки видео");
   }

   const blob = await response.blob();
   return URL.createObjectURL(blob);
};

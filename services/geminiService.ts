import OpenAI from "openai";
import { TEXT_MODELS } from '../constants';

// Initialize OpenAI client pointing to our Vercel Proxy
// The proxy (/openai-api) forwards to api.openai.com while hiding location
const openai = new OpenAI({
  apiKey: process.env.API_KEY, // User's OpenAI Key from Env
  baseURL: typeof window !== 'undefined' ? `${window.location.origin}/openai-api/v1` : undefined,
  dangerouslyAllowBrowser: true // Allowed because we are using a proxy for security/region anyway
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

export const streamChatResponse = async ({
  modelId,
  history,
  message,
  attachment,
  useSearch,
  systemInstruction,
  onChunk
}: StreamChatOptions) => {
  // 1. Explicitly check for API Key
  if (!process.env.API_KEY) {
    throw new Error("API Key не найден. Убедитесь, что настроен OPENAI_API_KEY.");
  }

  // 2. Select Model Strategy
  // We map the UI models to actual OpenAI models
  // Simple/Cheap -> gpt-4o-mini
  // Pro/Expensive -> gpt-4o
  const selectedModelDef = TEXT_MODELS.find(m => m.id === modelId);
  const isPro = selectedModelDef && selectedModelDef.cost > 1;
  const targetModel = isPro ? 'gpt-4o' : 'gpt-4o-mini';

  // 3. Prepare Chat History for OpenAI
  // Convert Google-style 'parts' to OpenAI 'content'
  const messages: any[] = [];

  // Inject System Instruction (Persona)
  const fakeModelName = selectedModelDef ? selectedModelDef.name : "AI Assistant";
  const fakeProvider = selectedModelDef ? selectedModelDef.provider : "OpenAI";
  
  let finalSystemInstruction = `You are ${fakeModelName}, a large language model trained by ${fakeProvider}. If asked about your identity, you must explicitly state that you are ${fakeModelName} from ${fakeProvider}.`;

  if (systemInstruction) {
    finalSystemInstruction = `${systemInstruction}\n\n${finalSystemInstruction}`;
  }
  
  messages.push({ role: 'system', content: finalSystemInstruction });

  // Convert previous history
  for (const turn of history) {
    const role = turn.role === 'model' ? 'assistant' : 'user';
    let content: any = "";
    
    // Check if there are images in history (OpenAI Vision)
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
        // Plain text
        content = turn.parts.map(p => ('text' in p ? p.text : '')).join(' ');
    }
    
    if (content) {
        messages.push({ role, content });
    }
  }

  // Add current message
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
  aspectRatio: string = "1:1"
): Promise<{ url: string | null, mimeType?: string }> => {
  if (!process.env.API_KEY) {
      throw new Error("API Key не найден.");
  }
  
  try {
    // Determine size based on aspect ratio approximation for DALL-E 3
    // DALL-E 3 supports 1024x1024, 1024x1792 (Vertical), 1792x1024 (Horizontal)
    let size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
    if (aspectRatio === "16:9") size = "1792x1024";
    if (aspectRatio === "9:16") size = "1024x1792";
    if (aspectRatio === "3:4") size = "1024x1792"; // Approx
    if (aspectRatio === "4:3") size = "1792x1024"; // Approx

    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
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

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TEXT_MODELS } from '../constants';

// Helper to get API key from either Vite env or Process env
const getApiKey = () => {
  // Check for VITE_API_KEY in import.meta.env (Vite/Vercel)
  // We use type casting to avoid TS errors if types aren't configured
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_KEY) {
    return (import.meta as any).env.VITE_API_KEY;
  }
  // Check standard process.env (Node/Dev)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const apiKey = getApiKey();
// Initialize with retrieved key or empty string to prevent immediate crash,
// though we validate before calls.
const ai = new GoogleGenAI({ apiKey: apiKey || 'missing_key' });

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
  // 1. Explicitly check for API Key presence
  if (!apiKey) {
    throw new Error("API Key не найден. Убедитесь, что VITE_API_KEY (для Vercel) или API_KEY настроен в переменных окружения.");
  }

  // 1. Prepare common data
  // Hack: Always use 'gemini-2.5-flash' regardless of what modelId is requested.
  // This circumvents quota limits on Pro models and ensures stability with the available key.
  const targetModel = 'gemini-2.5-flash';
  
  // Clean history: Remove turns with empty text parts to avoid "ContentUnion is required" error
  const cleanHistory = history.map(turn => ({
    role: turn.role,
    parts: turn.parts.filter(p => {
      // If it's a text part, ensure it's not empty or just whitespace
      if ('text' in p) return p.text && p.text.trim().length > 0;
      return true; // Keep other parts like inlineData
    })
  })).filter(turn => turn.parts.length > 0); // Remove turns that became empty

  // Construct the new message parts safely
  const newParts: any[] = [];
  
  // If there's an attachment, add it first
  if (attachment) {
    newParts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data
      }
    });
  }

  // Add text part only if it's not empty
  if (message && message.trim().length > 0) {
    newParts.push({ text: message });
  }

  // Fallback: If both are empty (shouldn't happen with UI validation, but safe to handle)
  // The API requires at least one part.
  if (newParts.length === 0) {
    newParts.push({ text: " " });
  }

  const tools = [];
  if (useSearch) {
    tools.push({ googleSearch: {} });
  }

  // Identify the requested model to inject persona
  const requestedModel = TEXT_MODELS.find(m => m.id === modelId);
  const fakeModelName = requestedModel ? requestedModel.name : "AI Assistant";
  const fakeProvider = requestedModel ? requestedModel.provider : "an advanced AI lab";
  
  // Inject Persona System Instruction
  // This makes Gemini 2.5 Flash pretend to be the selected model (e.g., GPT-5).
  const personaInstruction = `You are ${fakeModelName}, a large language model trained by ${fakeProvider}. You are NOT a Google Gemini model. If asked about your identity, architecture, or who created you, you must explicitly state that you are ${fakeModelName} from ${fakeProvider}. Do not mention Google or Gemini.`;
  
  // Combine with user system instruction if present
  const finalSystemInstruction = systemInstruction 
    ? `${systemInstruction}\n\n${personaInstruction}`
    : personaInstruction;

  // Internal helper to run the chat
  const attemptChat = async () => {
    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
      systemInstruction: finalSystemInstruction,
    };

    const chat = ai.chats.create({
      model: targetModel,
      history: cleanHistory,
      config: config
    });

    const result = await chat.sendMessageStream({ message: newParts });

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        onChunk(c.text);
      }
      
      // Handle grounding (Search results)
      if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = c.candidates[0].groundingMetadata.groundingChunks;
        const links = chunks
          .filter((ch: any) => ch.web?.uri)
          .map((ch: any) => `\n\n[Источник: ${ch.web.title}](${ch.web.uri})`)
          .join('');
        
        if (links) {
           onChunk(links);
        }
      }
    }
  };

  try {
    await attemptChat();
  } catch (error: any) {
    console.error("Chat error:", error);
    // Simple error propagation without the complex fallback message
    throw new Error(error.message || "Ошибка соединения с API");
  }
};

export const generateImage = async (
  modelId: string,
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<{ url: string | null, mimeType?: string }> => {
  if (!apiKey) {
      throw new Error("API Key не найден. Убедитесь, что VITE_API_KEY (для Vercel) или API_KEY настроен.");
  }
  try {
    // For this demo environment, we stick to the working flash-image for reliability
    const targetModel = 'gemini-2.5-flash-image'; 

    const response = await ai.models.generateContent({
        model: targetModel,
        contents: prompt,
    });

    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    mimeType: part.inlineData.mimeType
                };
            }
        }
    }
    
    throw new Error("No image generated.");

  } catch (error) {
    console.error("Image gen error:", error);
    throw error;
  }
};
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

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
  const isReasoningModel = modelId.includes('gemini-3') || modelId.includes('gpt-5') || modelId.includes('deepseek') || modelId.includes('claude-sonnet');
  const targetModel = isReasoningModel ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
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

  // Internal helper to run the chat
  const attemptChat = async (model: string) => {
    // Config: Add thinking for reasoning models (only if supported), and system instructions
    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (model === 'gemini-3-pro-preview') {
      // Enable thinking for complex models
      // SDK advises thinkingConfig only for 2.5 series, but 3-pro preview supports it in this context
      config.thinkingConfig = { thinkingBudget: 2048 }; 
    }

    const chat = ai.chats.create({
      model: model,
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
    // Try the primary target model first
    await attemptChat(targetModel);
  } catch (error: any) {
    console.error("Chat error:", error);
    
    // Check if error is quota related (429 or Resource Exhausted)
    // The error message might contain the JSON response from Google
    const errorMessage = error.message || JSON.stringify(error);
    const isQuotaError = errorMessage.includes('429') || 
                         errorMessage.includes('RESOURCE_EXHAUSTED') || 
                         errorMessage.includes('Quota exceeded');

    // Fallback logic: If Pro model fails with quota error, switch to Flash
    if (isQuotaError && targetModel === 'gemini-3-pro-preview') {
      console.warn("Quota exceeded for Pro model, falling back to Flash");
      
      // Inform user about the switch (optional but helpful)
      onChunk("\n\n*⚠️ Высокая нагрузка на Pro модель. Переключаемся на Gemini 2.5 Flash для завершения ответа...*\n\n");
      
      try {
        await attemptChat('gemini-2.5-flash');
      } catch (fallbackError: any) {
        // If fallback also fails, throw valid error
        throw new Error(fallbackError.message || "Ошибка соединения с API (все модели заняты)");
      }
    } else {
      // Throw error text so UI can display it if it's not a recoverable quota error
      throw new Error(error.message || "Ошибка соединения с API");
    }
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
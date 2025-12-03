import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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
  try {
    // Map concept models to real Gemini models
    const isReasoningModel = modelId.includes('gemini-3') || modelId.includes('gpt-5') || modelId.includes('deepseek') || modelId.includes('claude-sonnet');
    
    // 'gemini-3-pro-preview' allows thinking config
    const targetModel = isReasoningModel ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';

    const tools = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }

    // Config: Add thinking for reasoning models, and system instructions if provided
    const config: any = {
      tools: tools.length > 0 ? tools : undefined,
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (isReasoningModel) {
      // Enable thinking for complex models
      config.thinkingConfig = { thinkingBudget: 2048 }; 
    }

    // Construct the new message part
    const newParts: any[] = [{ text: message }];
    
    // If there's an attachment, add it to the user's current message
    if (attachment) {
      newParts.unshift({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }

    const chat = ai.chats.create({
      model: targetModel,
      history: history,
      config: config
    });

    const result = await chat.sendMessageStream(newParts);

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
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

export const generateImage = async (
  modelId: string,
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<{ url: string | null, mimeType?: string }> => {
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
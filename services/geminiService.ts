
import OpenAI from "openai";
import { TEXT_MODELS, VIDEO_MODELS } from '../constants';

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

// --- VIDEO GENERATION (MINIMAX IMPLEMENTATION) ---

// 1. Запуск задачи
export const generateVideo = async (
    fakeModelId: string, 
    prompt: string, 
    aspectRatio: string, 
    duration: number, 
    attachment?: { mimeType: string; data: string }
) => {
    // Находим реальную модель через маппинг или берем дефолт (MiniMax Hailuo)
    const modelDef = VIDEO_MODELS.find(m => m.id === fakeModelId);
    const realModel = modelDef?.geminiMap || 'video-01'; // 'video-01' is common identifier for Hailuo

    // Формируем payload согласно документации Minimax
    const payload: any = {
        model: realModel,
        prompt: prompt,
        // Hailuo обычно не принимает duration как число, но для совместимости оставим или адаптируем
        // Для API Minimax параметры могут отличаться, используем стандартные
    };

    // Если есть картинка (Image-to-Video)
    if (attachment) {
        payload.first_frame_image = `data:${attachment.mimeType};base64,${attachment.data}`;
    }

    try {
        const response = await fetch('/minimax-api?path=/v1/video_generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.base_resp && data.base_resp.status_code !== 0) {
            throw new Error(`Minimax API Error: ${data.base_resp.status_msg}`);
        }

        if (!data.task_id) {
            throw new Error("No task_id returned");
        }

        return { id: data.task_id };
    } catch (e: any) {
        console.error("Video Generation Start Error:", e);
        throw new Error(e.message || "Не удалось запустить генерацию видео");
    }
};

// 2. Проверка статуса (Polling)
export const pollVideoStatus = async (taskId: string) => {
    try {
        const response = await fetch(`/minimax-api?path=/v1/query/video_generation&task_id=${taskId}`);
        const data = await response.json();

        // Статусы: "Queued", "Processing", "Success", "Fail"
        if (data.status === 'Success') {
            return { status: 'completed', fileId: data.file_id, progress: 100 };
        } else if (data.status === 'Fail') {
            return { status: 'failed', progress: 0 };
        } else {
            // Имитация прогресса, т.к. API может не отдавать проценты
            return { status: 'processing', progress: 50 }; 
        }
    } catch (e) {
        console.error("Polling Error:", e);
        return { status: 'processing', progress: 0 }; // Не падаем, пробуем еще раз
    }
};

// 3. Получение ссылки на скачивание
export const getVideoContent = async (fileId: string) => {
    if (!fileId) throw new Error("No file_id provided");
    
    try {
        const response = await fetch(`/minimax-api?path=/v1/files/retrieve&file_id=${fileId}`);
        const data = await response.json();
        
        if (data.file && data.file.download_url) {
            return data.file.download_url;
        }
        throw new Error("Download URL not found");
    } catch (e: any) {
        console.error("Retrieve Error:", e);
        throw new Error("Не удалось получить ссылку на видео");
    }
};

// --- MUSIC GENERATION (Music 2.0) ---

// Хелпер для конвертации HEX в Blob
const hexToBlob = (hex: string, mimeType: string) => {
  const cleanHex = hex.replace(/[\s\n\r"']+/g, '');
  if (cleanHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
     throw new Error(`Invalid hex string (len: ${cleanHex.length})`);
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return new Blob([bytes], { type: mimeType });
};

export const generateMusic = async (prompt: string, lyrics: string) => {
    try {
        console.log("Starting Streaming Music Gen (v7.0 - Buffered)");

        const payload = {
            model: "music-2.0",
            prompt: prompt,
            lyrics: lyrics,
            output_format: "hex", 
            stream: true,         
            audio_setting: {
                sample_rate: 44100,
                bitrate: 128000,
                format: "mp3"
            }
        };

        const response = await fetch('/minimax-api?path=/v1/music_generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
             const errText = await response.text();
             throw new Error(`API Error ${response.status}: ${errText.slice(0, 100)}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullHexData = "";
        
        // БУФЕР ДЛЯ СКЛЕЙКИ КУСОЧКОВ
        let buffer = "";

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: !done });
            
            // Добавляем новый кусок в буфер
            buffer += chunkValue;
            
            // Разбиваем буфер на строки
            const lines = buffer.split('\n');
            
            // Последняя строка может быть неполной, сохраняем её обратно в буфер
            // Если поток закончился (done), то обрабатываем всё
            buffer = done ? "" : lines.pop() || "";

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;

                // Лог для отладки (покажет формат данных в консоли)
                if (fullHexData.length === 0) console.log("Stream Line Sample:", trimmedLine.substring(0, 50));

                // Обработка SSE (data: ...)
                if (trimmedLine.startsWith('data: ')) {
                    const jsonStr = trimmedLine.slice(6).trim();
                    if (jsonStr === '[DONE]') continue;
                    
                    try {
                        const json = JSON.parse(jsonStr);
                        // Ищем аудио в разных полях
                        if (json.data && json.data.audio) {
                            fullHexData += json.data.audio;
                        } else if (json.audio) {
                            fullHexData += json.audio;
                        } else if (json.data && json.data.hex) { // иногда бывает hex
                             fullHexData += json.data.hex;
                        }
                        
                        // Проверка на ошибки внутри стрима
                        if (json.base_resp && json.base_resp.status_code !== 0) {
                            console.error("Stream Error:", json.base_resp);
                        }
                    } catch (e) {
                        // Игнорируем ошибки парсинга конкретной строки
                    }
                } 
                // Обработка обычного JSON (если вдруг пришел не SSE, а ошибка)
                else if (trimmedLine.startsWith('{')) {
                    try {
                        const json = JSON.parse(trimmedLine);
                        if (json.base_resp && json.base_resp.status_code !== 0) {
                             throw new Error(`API Error: ${json.base_resp.status_msg}`);
                        }
                    } catch(e) {}
                }
            }
        }

        if (!fullHexData) {
            throw new Error("Стрим завершен, но аудио-данные не найдены. Проверьте консоль.");
        }

        console.log(`Stream finished. Got ${fullHexData.length} bytes of Hex.`);
        
        const blob = hexToBlob(fullHexData, 'audio/mpeg');
        const blobUrl = URL.createObjectURL(blob);
        
        return { url: blobUrl };

    } catch (e: any) {
        console.error("Music Generation Error:", e);
        throw new Error(e.message || "Не удалось создать музыку");
    }
};

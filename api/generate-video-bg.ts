
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge', 
  maxDuration: 300, // Увеличиваем лимит времени выполнения (если платформа поддерживает конфигурацию)
};

const MINIMAX_KEY = process.env.MINIMAX_API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_HOST = "https://api.minimax.io";

// Env vars handling for Edge
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(request: Request, context: any) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { prompt, model, userId, aspectRatio, duration, attachment } = await request.json();

    if (!MINIMAX_KEY || !BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 });
    }

    // 1. Мгновенно отвечаем клиенту
    const response = new Response(JSON.stringify({ success: true, message: "Started" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // 2. Фоновая задача
    context.waitUntil(
      (async () => {
        try {
          console.log(`[Background Video] Starting for user ${userId}`);

          // --- A. Запуск задачи в MiniMax ---
          const payload: any = {
            model: "video-01", // Стандартный ID для Hailuo/MiniMax Video
            prompt: prompt,
          };
          
          if (attachment) {
            payload.first_frame_image = `data:${attachment.mimeType};base64,${attachment.data}`;
          }

          const startRes = await fetch(`${API_HOST}/v1/video_generation`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MINIMAX_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const startData = await startRes.json();
          if (startData.base_resp && startData.base_resp.status_code !== 0) {
             throw new Error(`MiniMax Start Error: ${startData.base_resp.status_msg}`);
          }
          const taskId = startData.task_id;
          if (!taskId) throw new Error("No task_id returned");

          console.log(`[Background Video] Task started: ${taskId}`);

          // --- B. Поллинг статуса (ожидание готовности) ---
          let fileId = null;
          let attempts = 0;
          const maxAttempts = 120; // ~10 минут (при интервале 5 сек)

          while (!fileId && attempts < maxAttempts) {
             await new Promise(resolve => setTimeout(resolve, 5000)); // Ждем 5 сек
             attempts++;

             const queryRes = await fetch(`${API_HOST}/v1/query/video_generation?task_id=${taskId}`, {
                 headers: { 'Authorization': `Bearer ${MINIMAX_KEY}` }
             });
             const queryData = await queryRes.json();

             if (queryData.status === 'Success') {
                 fileId = queryData.file_id;
             } else if (queryData.status === 'Fail') {
                 throw new Error("Video generation failed on provider side");
             }
             // Если 'Processing' или 'Queued' - продолжаем цикл
          }

          if (!fileId) throw new Error("Timeout waiting for video generation");

          // --- C. Получение ссылки на скачивание ---
          const retrieveRes = await fetch(`${API_HOST}/v1/files/retrieve?file_id=${fileId}`, {
              headers: { 'Authorization': `Bearer ${MINIMAX_KEY}` }
          });
          const retrieveData = await retrieveRes.json();
          const downloadUrl = retrieveData.file?.download_url;
          
          if (!downloadUrl) throw new Error("Failed to get download URL");

          // --- D. Скачивание видео и загрузка в Supabase ---
          const videoRes = await fetch(downloadUrl);
          const videoArrayBuffer = await videoRes.arrayBuffer();
          const videoBytes = new Uint8Array(videoArrayBuffer);
          const videoBlob = new Blob([videoBytes], { type: 'video/mp4' });

          let finalPublicUrl = downloadUrl; // Фолбэк на временную ссылку

          if (SUPABASE_URL && SUPABASE_KEY) {
             try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: { persistSession: false }
                });
                
                const filename = `video_${userId}_${Date.now()}.mp4`;
                
                // Upload to 'videos' bucket
                const { error: uploadError } = await supabase.storage
                    .from('videos') // Убедитесь, что бакет videos существует
                    .upload(filename, videoBytes, {
                        contentType: 'video/mp4',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data } = supabase.storage
                        .from('videos')
                        .getPublicUrl(filename);
                    finalPublicUrl = data.publicUrl;

                    // Save to DB
                    await supabase.from('generated_videos').insert([{
                        user_id: userId,
                        url: finalPublicUrl,
                        prompt: prompt,
                        model: model
                    }]);
                } else {
                    console.error("Supabase Storage Error:", uploadError);
                }
             } catch (e) { console.error("Supabase Error:", e); }
          }

          // --- E. Отправка в Telegram ---
          const formData = new FormData();
          formData.append('chat_id', String(userId));
          formData.append('caption', `🎥 **${prompt ? prompt.slice(0, 50) : 'Video'}...**\nGenerated by UniAI`);
          formData.append('video', videoBlob, 'video.mp4');

          const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
             method: 'POST',
             body: formData
          });
          
          if (!tgRes.ok) {
              const tgErr = await tgRes.text();
              console.error("[Background Video] Telegram send failed:", tgErr);
          } else {
              console.log(`[Background Video] Sent to user ${userId}`);
          }

        } catch (err: any) {
          console.error("[Background Video] Error:", err);
          // Уведомление об ошибке
          try {
             await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 chat_id: userId,
                 text: "⚠️ Ошибка при создании видео. Попробуйте еще раз или измените промпт."
               })
             });
          } catch (e) {}
        }
      })()
    );

    return response;

  } catch (error: any) {
    console.error("Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

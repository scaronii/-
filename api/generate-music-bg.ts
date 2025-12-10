
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge', 
};

const MINIMAX_KEY = process.env.MINIMAX_API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_HOST = "https://api.minimax.io";

// Env vars handling for Edge
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Prefer Service Role Key for backend operations to bypass RLS
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(request: Request, context: any) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { prompt, lyrics, userId, model } = await request.json();

    if (!MINIMAX_KEY || !BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 });
    }

    const response = new Response(JSON.stringify({ success: true, message: "Started" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    context.waitUntil(
      (async () => {
        try {
          console.log(`[Background] Starting music gen for user ${userId}`);
          
          // 1. Generate Audio via MiniMax
          const payload = {
            model: "music-2.0",
            prompt: prompt,
            lyrics: lyrics,
            output_format: "hex", 
            stream: false,        
            audio_setting: {
              sample_rate: 44100,
              bitrate: 128000,
              format: "mp3"
            }
          };

          const mmRes = await fetch(`${API_HOST}/v1/music_generation`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${MINIMAX_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!mmRes.ok) {
            const err = await mmRes.text();
            throw new Error(`MiniMax API Error: ${err}`);
          }

          const mmData = await mmRes.json();
          
          let hexData = "";
          if (mmData.data && mmData.data.audio) hexData = mmData.data.audio;
          else if (mmData.audio) hexData = mmData.audio;
          else if (mmData.data && mmData.data.hex) hexData = mmData.data.hex;

          if (!hexData) {
            throw new Error("No audio data received from MiniMax");
          }

          // Convert Hex to Uint8Array (Buffer)
          const cleanHex = hexData.replace(/[\s\n\r"']+/g, '');
          if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex length");
          
          const byteCharacters = new Uint8Array(cleanHex.length / 2);
          for (let i = 0; i < cleanHex.length; i += 2) {
            byteCharacters[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
          }
          
          // For Telegram we need a Blob
          const audioBlob = new Blob([byteCharacters], { type: 'audio/mpeg' });

          // 2. Upload to Supabase Storage
          let publicUrl = "";
          if (SUPABASE_URL && SUPABASE_KEY) {
             try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
                    auth: { persistSession: false }
                });
                
                const filename = `music_${userId}_${Date.now()}.mp3`;
                
                // Upload to 'music' bucket using Uint8Array directly for better Edge compatibility
                const { error: uploadError } = await supabase.storage
                    .from('music')
                    .upload(filename, byteCharacters, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                if (uploadError) {
                    console.error("Supabase Storage Upload Error:", uploadError);
                } else {
                    const { data } = supabase.storage
                        .from('music')
                        .getPublicUrl(filename);
                    
                    publicUrl = data.publicUrl;

                    // Save record to DB
                    // Make sure 'generated_music' table exists and has user_id (bigint), url (text), prompt (text), model (text)
                    const { error: dbError } = await supabase.from('generated_music').insert([{
                        user_id: userId,
                        url: publicUrl,
                        prompt: prompt,
                        model: model || 'music-2.0'
                    }]);
                    
                    if (dbError) console.error("Supabase DB Insert Error:", dbError);
                    else console.log("Saved music to DB:", publicUrl);
                }
             } catch (dbError) {
                 console.error("Supabase Client Error:", dbError);
             }
          } else {
              console.warn("Missing Supabase Credentials in Edge Function");
          }

          // 3. Send to Telegram
          const formData = new FormData();
          formData.append('chat_id', String(userId));
          formData.append('caption', `🎵 **${prompt.slice(0, 50)}...**\nby MiniMax Music 2.0 (UniAI)`);
          formData.append('title', 'UniAI Generated Track');
          formData.append('performer', 'UniAI AI');
          formData.append('audio', audioBlob, `music-${Date.now()}.mp3`);

          const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
             method: 'POST',
             body: formData
          });

          const tgData = await tgRes.json();
          if (!tgData.ok) {
             console.error("[Background] Telegram Error:", tgData);
          } else {
             console.log(`[Background] Music sent to user ${userId}`);
          }

        } catch (err) {
          console.error("[Background] Error:", err);
          try {
             await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 chat_id: userId,
                 text: "⚠️ Не удалось создать музыку. Попробуйте изменить текст или стиль."
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

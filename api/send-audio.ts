
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { userId, audioUrl, caption } = await request.json();
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
        return new Response(JSON.stringify({ error: 'Server config error: No Bot Token' }), { status: 500 });
    }

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`;
    const formData = new FormData();
    
    formData.append('chat_id', userId);
    formData.append('caption', caption || '🎵 Ваш трек от UniAI');

    // Проверка: является ли audioUrl Data URI (Base64)
    if (audioUrl.startsWith('data:')) {
        const matches = audioUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mimeType = matches[1]; // например 'audio/mpeg' или 'audio/wav'
            const base64Data = matches[2];
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            
            // Определяем расширение файла
            let ext = 'mp3';
            if (mimeType.includes('wav')) ext = 'wav';
            if (mimeType.includes('m4a')) ext = 'm4a';
            if (mimeType.includes('ogg')) ext = 'ogg';

            formData.append('audio', blob, `audio.${ext}`);
        } else {
             // Фолбэк, если регэксп не сработал, пробуем отправить как есть (хотя это вряд ли сработает для Telegram API)
             formData.append('audio', audioUrl);
        }
    } else {
        // Обычная ссылка
        formData.append('audio', audioUrl); 
    }

    const response = await fetch(tgUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.ok) {
        console.error('Telegram API Error:', data);
        throw new Error(data.description || 'Failed to send audio to Telegram');
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error: any) {
    console.error('Send Audio Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

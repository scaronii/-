
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
    formData.append('audio', audioUrl); // Telegram supports sending via URL

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

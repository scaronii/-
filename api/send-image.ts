
export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { userId, imageUrl, caption } = await request.json();
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
        return new Response(JSON.stringify({ error: 'Server config error: No Bot Token' }), { status: 500 });
    }

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    const formData = new FormData();
    
    formData.append('chat_id', userId);
    formData.append('caption', caption || '🎨 Ваше изображение от UniAI');

    // Проверяем, в каком формате пришла картинка
    if (imageUrl.startsWith('data:')) {
        // Если это Base64 (data URI), конвертируем в бинарный файл
        // Формат обычно: data:image/png;base64,iVBORw0K...
        const matches = imageUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mimeType = matches[1]; // например 'image/png'
            const base64Data = matches[2];
            
            // Преобразуем base64 строку в байтовый массив
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            
            // Добавляем как файл
            formData.append('photo', blob, 'image.png');
        } else {
            throw new Error('Invalid base64 image format');
        }
    } else {
        // Если это обычная http ссылка
        formData.append('photo', imageUrl);
    }

    // Отправляем в Telegram
    const response = await fetch(tgUrl, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.ok) {
        console.error('Telegram API Error:', data);
        throw new Error(data.description || 'Failed to send photo to Telegram');
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error: any) {
    console.error('Send Image Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

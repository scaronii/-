export const config = {
  runtime: 'edge',
};

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.API_KEY;
const SITE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://uniai.app';
const SITE_NAME = 'UniAI Platform';

export default async function handler(request: Request) {
  // 1. Обработка CORS (Preflight запросы)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Title, HTTP-Referer',
      },
    });
  }

  // 2. Проверка наличия ключа API
  if (!OPENROUTER_KEY) {
    console.error("❌ Ошибка: Не найден OPENROUTER_API_KEY в переменных окружения");
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const url = new URL(request.url);
  // Убираем префикс /openai-api/ чтобы получить путь для OpenRouter
  const targetPath = url.pathname.replace(/^\/openai-api\//, '');
  const finalUrl = `https://openrouter.ai/api/${targetPath}${url.search}`;

  // 3. Подготовка заголовков
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.delete('connection'); // Важно удалить connection header
  
  headers.set('Authorization', `Bearer ${OPENROUTER_KEY}`);
  headers.set('HTTP-Referer', SITE_URL);
  headers.set('X-Title', SITE_NAME);
  
  // Убедимся, что Content-Type проброшен (обычно application/json)
  if (!headers.has('content-type') && request.headers.get('content-type')) {
    headers.set('content-type', request.headers.get('content-type')!);
  }

  try {
    // 4. Проксирование запроса (Стриминг)
    // Мы передаем request.body напрямую, не ожидая полной загрузки (arrayBuffer)
    const backendResponse = await fetch(finalUrl, {
      method: request.method,
      headers: headers,
      body: request.body, 
    });

    // 5. Подготовка ответа клиенту
    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    
    // Важно: переписываем Content-Encoding, чтобы избежать ошибок сжатия
    responseHeaders.delete('content-encoding'); 
    responseHeaders.delete('content-length');

    // Если OpenRouter вернул ошибку (например, 401 или 400), мы логируем её тело
    if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error(`OpenRouter Error (${backendResponse.status}):`, errorText);
        return new Response(errorText, {
            status: backendResponse.status,
            headers: responseHeaders
        });
    }

    // Возвращаем поток (body) напрямую, чтобы избежать таймаутов на Vercel
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error("Proxy Internal Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Proxy error" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
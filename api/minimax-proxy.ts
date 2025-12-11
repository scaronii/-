
export const config = {
  runtime: 'edge', // Edge идеально подходит для стриминга
};

const MINIMAX_KEY = process.env.MINIMAX_API_KEY;
const API_HOST = "https://api.minimax.io"; 

export default async function handler(request: Request) {
  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (!MINIMAX_KEY) {
    return new Response(JSON.stringify({ error: 'Server config error: Missing MINIMAX_API_KEY' }), { status: 500 });
  }

  const url = new URL(request.url);
  const targetPath = url.searchParams.get('path');
  
  if (!targetPath) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), { status: 400 });
  }

  const finalUrl = new URL(API_HOST + targetPath);
  url.searchParams.forEach((value, key) => {
      if (key !== 'path') finalUrl.searchParams.append(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('Authorization', `Bearer ${MINIMAX_KEY}`);
  
  // ВАЖНО: Не устанавливаем Content-Type принудительно, если клиент его уже прислал.
  // Это критично для multipart/form-data (загрузка файлов), где браузер сам ставит boundary.
  if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(finalUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method === 'POST' ? request.body : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upstream Error (${response.status}):`, errorText);
        return new Response(errorText, { status: response.status });
    }

    // ВАЖНО: Передаем response.body напрямую (Streaming) с правильными заголовками
    return new Response(response.body, {
      status: response.status,
      headers: {
        // Копируем тип контента от MiniMax или ставим event-stream по умолчанию
        'Content-Type': response.headers.get('content-type') || 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("MiniMax Proxy Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
export const config = {
  runtime: 'edge',
};

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.API_KEY;
const SITE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://uniai.app';
const SITE_NAME = 'UniAI Platform';

export default async function handler(request: Request) {
  // CORS Preflight
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

  const url = new URL(request.url);
  // Убираем префикс /openai-api/
  const targetPath = url.pathname.replace(/^\/openai-api\//, '');
  const finalUrl = `https://openrouter.ai/api/${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('Authorization', `Bearer ${OPENROUTER_KEY}`);
  headers.set('HTTP-Referer', SITE_URL);
  headers.set('X-Title', SITE_NAME);

  try {
    // Используем fetch напрямую с request.body для стриминга (без arrayBuffer)
    const backendResponse = await fetch(finalUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    // Удаляем заголовки, которые могут вызвать ошибки при проксировании сжатого контента
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error(`Upstream Error (${backendResponse.status}):`, errorText);
        return new Response(errorText, { status: backendResponse.status, headers: responseHeaders });
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error("Proxy Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
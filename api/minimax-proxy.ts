
export const config = {
  runtime: 'edge', // Edge функции лучше подходят для стриминга
};

const MINIMAX_KEY = process.env.MINIMAX_API_KEY;
const API_HOST = "https://api.minimax.io"; 

export default async function handler(request: Request) {
  // CORS Preflight
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
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing MINIMAX_API_KEY' }), { status: 500 });
  }

  const url = new URL(request.url);
  // Extract the target path from the query parameter 'path'
  const targetPath = url.searchParams.get('path');
  
  if (!targetPath) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), { status: 400 });
  }

  // Construct the final URL
  const finalUrl = new URL(API_HOST + targetPath);
  
  // Append all other query parameters to the final URL
  url.searchParams.forEach((value, key) => {
      if (key !== 'path') finalUrl.searchParams.append(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('Authorization', `Bearer ${MINIMAX_KEY}`);
  headers.set('Content-Type', 'application/json');

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

    // ИСПРАВЛЕНИЕ: Передаем response.body напрямую, не дожидаясь загрузки (Stream)
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // Важно для стриминга SSE
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("MiniMax Proxy Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

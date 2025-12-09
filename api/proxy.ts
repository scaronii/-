
export const config = {
  runtime: 'edge',
};

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.API_KEY;
const SITE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://uniai.app';
const SITE_NAME = 'UniAI Platform';

export default async function handler(request: Request) {
  // Handle CORS Preflight
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
  const targetPath = url.pathname.replace(/^\/openai-api\//, '');
  const finalUrl = `https://openrouter.ai/api/${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('Authorization', `Bearer ${OPENROUTER_KEY}`);
  headers.set('HTTP-Referer', SITE_URL);
  headers.set('X-Title', SITE_NAME);
  
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  try {
    const bodyBuffer = await request.arrayBuffer();

    const backendResponse = await fetch(finalUrl, {
      method: request.method,
      headers: headers,
      body: bodyBuffer,
    });

    // Fully buffer the response to avoid streaming encoding issues
    const responseData = await backendResponse.arrayBuffer();

    // Construct clean headers to avoid browser decoding conflicts (gzip, etc)
    const newHeaders = new Headers();
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Content-Type', backendResponse.headers.get('content-type') || 'application/json');

    return new Response(responseData, {
      status: backendResponse.status,
      headers: newHeaders,
    });
  } catch (e) {
    console.error("Proxy Error:", e);
    return new Response(JSON.stringify({ error: 'Connection to OpenRouter Failed' }), { 
      status: 502,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
}

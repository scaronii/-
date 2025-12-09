
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
  
  // Remove the local proxy prefix to get the target path
  // e.g., /openai-api/v1/chat/completions -> v1/chat/completions
  const targetPath = url.pathname.replace(/^\/openai-api\//, '');
  
  // Route everything to OpenRouter
  const targetUrl = `https://openrouter.ai/api/${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-forwarded-for');
  headers.delete('x-real-ip');
  
  // OpenRouter Authentication & Identification
  headers.set('Authorization', `Bearer ${OPENROUTER_KEY}`);
  headers.set('HTTP-Referer', SITE_URL);
  headers.set('X-Title', SITE_NAME);
  
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      // @ts-ignore
      duplex: 'half', 
    });

    // Create a new response to allow adding CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (e) {
    console.error("Proxy Error:", e);
    return new Response(JSON.stringify({ error: 'Connection to OpenRouter Failed' }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

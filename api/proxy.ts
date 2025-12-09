
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
  // Strip the /openai-api/ prefix to get the target path
  const targetPath = url.pathname.replace(/^\/openai-api\//, '');
  // Construct the final URL (OpenRouter)
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
    // 1. Read the request body fully
    const bodyBuffer = await request.arrayBuffer();

    // 2. Forward request to OpenRouter
    const backendResponse = await fetch(finalUrl, {
      method: request.method,
      headers: headers,
      body: bodyBuffer,
    });

    // 3. Read the response body fully (prevents streaming encoding errors in browser)
    const responseData = await backendResponse.arrayBuffer();

    // 4. Construct clean headers for the client
    const newHeaders = new Headers();
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Content-Type', backendResponse.headers.get('content-type') || 'application/json');
    
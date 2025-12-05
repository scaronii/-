// api/proxy.ts
export const config = {
  runtime: 'edge', // Используем Edge для скорости
};

export default async function handler(request: Request) {
  // 1. Разбираем URL
  const url = new URL(request.url);
  
  // Получаем путь после /openai-api/
  // Например, если запрос на /openai-api/v1/chat/completions
  const targetPath = url.pathname.replace(/^\/openai-api\//, '');
  const targetUrl = `https://api.openai.com/${targetPath}${url.search}`;

  // 2. Копируем заголовки, но ИСКЛЮЧАЕМ те, что выдают локацию
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-forwarded-for'); // Самое важное: удаляем ваш IP
  headers.delete('x-real-ip');
  headers.delete('cf-connecting-ip'); // Если используется Cloudflare
  
  // Ensure content-type is passed correctly
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // 3. Формируем новый запрос к OpenAI
  const openaiResponse = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    // @ts-ignore
    duplex: 'half', // Нужно для streaming body в Edge runtime
  });

  // 4. Отдаем ответ обратно фронтенду как есть (стриминг)
  return new Response(openaiResponse.body, {
    status: openaiResponse.status,
    headers: openaiResponse.headers,
  });
}
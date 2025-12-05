export const config = {
  runtime: 'edge',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { planId, userId, price, title, description } = await request.json();

    if (!BOT_TOKEN) {
        console.error('Telegram Bot Token is missing');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    // В Telegram Stars цена должна быть целым числом
    const amount = Math.floor(price);

    const invoiceData = {
      chat_id: userId,
      title: title,
      description: description,
      payload: planId, // Важно для webhook.ts
      provider_token: "", // ПУСТАЯ СТРОКА ДЛЯ STARS - ЭТО ВАЖНО
      currency: "XTR",    // Валюта Telegram Stars
      prices: [{ label: title, amount: amount }],
      start_parameter: 'payment-start',
      // Отключаем запрос данных доставки для цифровых товаров
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      is_flexible: false,
    };

    const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`;
    
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API Error:', data);
      return new Response(JSON.stringify({ error: data.description || 'Ошибка Telegram API' }), { status: 500 });
    }

    return new Response(JSON.stringify({ invoiceLink: data.result }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Invoice Creation Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
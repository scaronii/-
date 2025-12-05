// This file handles updates from Telegram (Payment success)
// It runs as a Serverless Function on Vercel
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Получаем ключи Supabase из переменных окружения
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

// Для записи баланса (операция админа) используем Service Role Key если есть, иначе Anon Key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const update = await request.json();

    // 1. Обработка Pre-Checkout (пользователь нажал "Оплатить")
    // Telegram требует подтверждения валидности заказа за 10 секунд
    if (update.pre_checkout_query) {
      const { id } = update.pre_checkout_query;
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: id,
          ok: true // Одобряем любые платежи
        })
      });
      
      return new Response('OK', { status: 200 });
    }

    // 2. Обработка успешной оплаты
    if (update.message?.successful_payment) {
      const { total_amount, invoice_payload } = update.message.successful_payment;
      const userId = update.message.from.id; // Telegram ID пользователя

      console.log(`Processing payment for user ${userId}, payload: ${invoice_payload}`);

      // Определяем количество токенов
      let tokensToAdd = 50000;
      if (invoice_payload?.includes('standard')) tokensToAdd = 150000;
      else if (invoice_payload?.includes('optimal')) tokensToAdd = 500000;
      else if (invoice_payload?.includes('pro')) tokensToAdd = 1500000;
      
      // Если ключи БД настроены, начисляем токены
      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // 1. Проверяем, существует ли пользователь
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('balance')
          .eq('telegram_id', userId)
          .single();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching user:", fetchError);
        }

        if (!user) {
          // Если пользователя нет (редкий кейс, но возможен), создаем
          await supabase.from('users').insert([{
            telegram_id: userId,
            first_name: update.message.from.first_name,
            username: update.message.from.username,
            balance: 50000 + tokensToAdd
          }]);
        } else {
          // Если пользователь есть, обновляем баланс
          const newBalance = (user.balance || 0) + tokensToAdd;
          await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', userId);
        }

        console.log(`Tokens added. User: ${userId}, Amount: ${tokensToAdd}`);
      } else {
        console.error("Supabase credentials missing in webhook environment");
      }

      // Отправляем сообщение об успехе пользователю
      if (BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `✅ Оплата прошла успешно!\n\nНа ваш баланс начислено ${tokensToAdd.toLocaleString()} токенов.\nПриятного пользования!`
            })
          });
      }

      return new Response('OK', { status: 200 });
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response('Error processing update', { status: 500 });
  }
}
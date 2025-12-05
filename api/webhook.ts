
// This file handles updates from Telegram (Payment success)
// It runs as a Serverless Function on Vercel
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const update = await request.json();

    if (update.pre_checkout_query) {
      const { id } = update.pre_checkout_query;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pre_checkout_query_id: id,
          ok: true
        })
      });
      return new Response('OK', { status: 200 });
    }

    if (update.message?.successful_payment) {
      const { invoice_payload, total_amount } = update.message.successful_payment;
      const userId = update.message.from.id;

      console.log(`Processing payment for user ${userId}, payload: ${invoice_payload}`);

      // Определяем количество звезд по ID пакета или цене
      let starsToAdd = total_amount; // По умолчанию столько, сколько заплатили (1 XTR = 1 Star)
      
      // Можно переопределить по payload, если есть бонусы
      if (invoice_payload === 'pack_medium') starsToAdd = 275; // 250 + 25 bonus
      else if (invoice_payload === 'pack_large') starsToAdd = 1150; // 1000 + 150 bonus
      else if (invoice_payload === 'pack_whale') starsToAdd = 6000; // 5000 + 1000 bonus
      else if (invoice_payload === 'pack_small') starsToAdd = 50;

      if (SUPABASE_URL && SUPABASE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const { data: user } = await supabase
          .from('users')
          .select('balance')
          .eq('telegram_id', userId)
          .single();

        if (!user) {
          await supabase.from('users').insert([{
            telegram_id: userId,
            first_name: update.message.from.first_name,
            username: update.message.from.username,
            balance: starsToAdd
          }]);
        } else {
          const newBalance = (user.balance || 0) + starsToAdd;
          await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', userId);
        }

        console.log(`Stars added. User: ${userId}, Amount: ${starsToAdd}`);
      }

      if (BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `✅ Оплата прошла успешно!\n\nНа ваш баланс начислено ${starsToAdd.toLocaleString()} звезд.\nПриятного пользования!`
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

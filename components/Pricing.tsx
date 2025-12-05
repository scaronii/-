import React, { useState } from 'react';
import { Check, Zap, Star, AlertCircle } from 'lucide-react';
import { PLANS, FAQ_ITEMS } from '../constants';
import { clsx } from 'clsx';
import { TelegramUser } from '../types';

interface PricingProps {
  tgUser: TelegramUser | null;
}

export const Pricing: React.FC<PricingProps> = ({ tgUser }) => {
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');

  const handleBuy = (plan: any) => {
    // 1. Check if running inside Telegram
    if (!(window as any).Telegram?.WebApp?.initData) {
      alert("Для оплаты откройте приложение через Telegram бота.");
      return;
    }

    const tg = (window as any).Telegram.WebApp;

    // 2. Send Invoice Request to your Backend (which calls Telegram API)
    // Since we don't have a real backend connected in this demo, we simulate the flow:
    // User clicks button -> WebApp sends data to bot -> Bot sends invoice.
    
    // In a real app, you would do:
    // await fetch('/api/create-invoice', { body: JSON.stringify({ planId: plan.id, userId: tgUser.id }) })
    // tg.openInvoice(invoiceLink);

    // Using `openLink` with a start parameter to trigger invoice in bot chat is a common pattern for WebApps without direct invoice integration 
    // OR directly using openInvoice if you have the link.
    
    // Demo Simulation:
    alert(`Запрос на покупку тарифа "${plan.name}" отправлен! В реальном приложении здесь откроется окно оплаты Telegram.`);
    
    // Example of how to trigger invoice if you generated one via API:
    // tg.openInvoice(INVOICE_URL, (status) => {
    //   if (status === 'paid') {
    //     tg.close();
    //   }
    // });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full p-6 lg:p-12">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-charcoal mb-6 tracking-tight">Пополните баланс</h1>
          <p className="text-gray-500 max-w-2xl mx-auto mb-10 text-lg">
            Оплата через Telegram Stars или банковской картой РФ. Безопасно и мгновенно.
          </p>
          
          {!tgUser && (
             <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-xl mb-6 border border-yellow-100">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">Откройте в Telegram для оплаты</span>
             </div>
          )}

          <div className="inline-flex bg-surface p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={() => setBillingPeriod('month')}
              className={clsx(
                "px-8 py-3 rounded-xl text-sm font-bold transition-all",
                billingPeriod === 'month' ? "bg-charcoal text-white shadow-md" : "text-gray-500 hover:bg-gray-50 hover:text-charcoal"
              )}
            >
              Ежемесячно
            </button>
            <button
              onClick={() => setBillingPeriod('year')}
              className={clsx(
                "px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                billingPeriod === 'year' ? "bg-charcoal text-white shadow-md" : "text-gray-500 hover:bg-gray-50 hover:text-charcoal"
              )}
            >
              Ежегодно
              <span className="text-[10px] bg-lime text-charcoal px-2 py-0.5 rounded-full font-extrabold">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          {PLANS.map((plan) => (
            <div 
              key={plan.id}
              className={clsx(
                "relative rounded-[2rem] p-8 flex flex-col transition-all duration-300",
                plan.isPopular 
                  ? "bg-surface shadow-xl ring-2 ring-lime scale-105 z-10" 
                  : "bg-surface shadow-soft border border-gray-50 hover:shadow-lg hover:-translate-y-1"
              )}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lime text-charcoal text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> ЛУЧШИЙ ВЫБОР
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-xl font-bold text-charcoal">{plan.name}</h3>
                {plan.isPro && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md mt-1 inline-block">BUSINESS</span>}
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold text-charcoal">
                  {billingPeriod === 'year' ? Math.round(plan.price * 0.8) : plan.price}₽
                </span>
                <span className="text-gray-400 font-medium">/мес</span>
              </div>

              <div className="space-y-6 mb-8 flex-1">
                <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 text-lime-600">
                    <Zap size={20} fill="currentColor" className="text-charcoal" />
                  </div>
                  <div>
                    <span className="font-bold text-charcoal block text-lg">{plan.tokens.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">токенов/мес</span>
                  </div>
                </div>

                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600 font-medium">
                      <div className="w-5 h-5 rounded-full bg-lime/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} className="text-charcoal stroke-[3]" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => handleBuy(plan)}
                disabled={!tgUser}
                className={clsx(
                  "w-full py-4 rounded-2xl font-bold transition-all transform active:scale-95",
                  plan.isPopular
                    ? "bg-charcoal text-white hover:bg-black shadow-lg hover:shadow-xl"
                    : "bg-gray-100 text-charcoal hover:bg-gray-200",
                  !tgUser && "opacity-50 cursor-not-allowed"
                )}
              >
                {tgUser ? `Купить за ${plan.price}₽` : "Только в Telegram"}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-charcoal mb-10">Частые вопросы</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="bg-surface rounded-3xl p-6 shadow-soft border border-gray-50 hover:border-gray-100 transition-colors">
                <h3 className="font-bold text-charcoal text-lg mb-3">{item.q}</h3>
                <p className="text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Star, AlertCircle, Loader2, Sparkles, Zap } from 'lucide-react';
import { CREDIT_PACKS, FAQ_ITEMS } from '../constants';
import { clsx } from 'clsx';
import { TelegramUser } from '../types';

interface PricingProps {
  tgUser: TelegramUser | null;
}

export const Pricing: React.FC<PricingProps> = ({ tgUser }) => {
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);

  const handleBuy = async (pack: any) => {
    if (!(window as any).Telegram?.WebApp?.initData) {
      alert("Для оплаты откройте приложение через Telegram бота.");
      return;
    }

    const tg = (window as any).Telegram.WebApp;
    setLoadingPackId(pack.id);

    try {
        const response = await fetch('/api/create-invoice', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                packId: pack.id, 
                userId: tgUser?.id, 
                price: pack.price, // Price in XTR
                title: `${pack.stars} Звезд (Stars)`,
                description: `Пополнение баланса на ${pack.stars} звезд + ${pack.bonus || '0 бонусов'}`
            }) 
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert("Ошибка создания счета: " + data.error);
            setLoadingPackId(null);
            return;
        }

        tg.openInvoice(data.invoiceLink, (status: string) => {
            setLoadingPackId(null);
            if (status === 'paid') {
                tg.close();
            }
        });

    } catch (e) {
        console.error(e);
        alert("Ошибка соединения. Проверьте интернет.");
        setLoadingPackId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-12 pt-16 md:pt-6">
        
        <div className="text-center mb-8 md:mb-16">
          <h1 className="text-3xl md:text-5xl font-bold text-charcoal mb-4 md:mb-6 tracking-tight">Магазин Звезд</h1>
          <p className="text-gray-500 max-w-2xl mx-auto mb-6 md:mb-10 text-base md:text-lg px-2">
             Оплата только за то, что используете. Без подписок и скрытых списаний.
          </p>
          
          {!tgUser && (
             <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-xl mb-6 border border-yellow-100 text-sm">
                <AlertCircle size={16} />
                <span className="font-medium">Откройте в Telegram для оплаты</span>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-20">
          {CREDIT_PACKS.map((pack) => (
            <div 
              key={pack.id}
              className={clsx(
                "relative rounded-[2rem] p-6 md:p-8 flex flex-col transition-all duration-300",
                pack.isPopular 
                  ? "bg-surface shadow-xl ring-2 ring-lime scale-100 md:scale-105 z-10" 
                  : "bg-surface shadow-soft border border-gray-50 hover:shadow-lg hover:-translate-y-1"
              )}
            >
              {pack.isPopular && (
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-lime text-charcoal text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> ХИТ
                </div>
              )}
              
              <div className="mb-6 md:mb-8 text-center">
                 <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-lime/20 rounded-2xl text-lime-600 mb-4">
                    <Star size={24} md:size={32} fill="currentColor" />
                 </div>
                 <h3 className="text-3xl md:text-3xl font-bold text-charcoal">{pack.stars}</h3>
                 <span className="text-xs md:text-sm text-gray-400 font-bold uppercase tracking-wider">Звезд</span>
              </div>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 flex-1">
                {pack.bonus && (
                  <div className="bg-purple-50 text-purple-700 px-4 py-3 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2">
                    <Sparkles size={16} />
                    {pack.bonus}
                  </div>
                )}
                
                <div className="text-xs md:text-sm text-gray-500 text-center leading-relaxed">
                   Хватит примерно на:<br/>
                   <strong className="text-charcoal">{Math.floor(pack.stars)} сообщений</strong> (Flash)<br/>
                   или <strong className="text-charcoal">{Math.floor(pack.stars / 50)} картинок</strong>
                </div>
              </div>

              <button 
                onClick={() => handleBuy(pack)}
                disabled={!tgUser || loadingPackId === pack.id}
                className={clsx(
                  "w-full py-3.5 md:py-4 rounded-2xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base",
                  pack.isPopular
                    ? "bg-charcoal text-white hover:bg-black shadow-lg hover:shadow-xl"
                    : "bg-gray-100 text-charcoal hover:bg-gray-200",
                  (!tgUser || loadingPackId === pack.id) && "opacity-50 cursor-not-allowed"
                )}
              >
                {loadingPackId === pack.id ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    Купить за {pack.price}
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-charcoal mb-6 md:mb-10">Частые вопросы</h2>
          <div className="space-y-3 md:space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="bg-surface rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-soft border border-gray-50 hover:border-gray-100 transition-colors">
                <h3 className="font-bold text-charcoal text-base md:text-lg mb-2 md:mb-3">{item.q}</h3>
                <p className="text-sm md:text-base text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

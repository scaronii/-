
import React, { useEffect, useState } from 'react';
import { Gift, Users, Copy, Share2, Star, CheckCircle2 } from 'lucide-react';
import { TelegramUser } from '../types';
import { userService } from '../services/userService';
import { clsx } from 'clsx';

interface EarnProps {
  user: TelegramUser | null;
  balance: number;
}

export const Earn: React.FC<EarnProps> = ({ user, balance }) => {
  const [stats, setStats] = useState({ count: 0, earned: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      userService.getReferralStats(user.id).then(setStats);
    }
  }, [user]);

  const referralLink = user 
    ? `https://t.me/UniAI_AppBot/app?startapp=ref_${user.id}`
    : 'Загрузка...';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    if ((window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        const text = "🚀 Попробуй UniAI! Здесь GPT-5, Gemini и генерация видео без VPN. Заходи по ссылке:";
        const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
        tg.openTelegramLink(url);
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div className="text-center">
           <div className="w-20 h-20 bg-gradient-to-tr from-yellow-300 to-orange-400 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-glow transform -rotate-6">
              <Gift size={40} strokeWidth={2.5} />
           </div>
           <h1 className="text-3xl md:text-5xl font-bold text-charcoal mb-4">Реферальная программа</h1>
           <p className="text-gray-500 text-lg max-w-lg mx-auto">
             Приглашайте друзей в UniAI и получайте звезды для генерации контента.
           </p>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-charcoal to-black text-white rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-lime/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
           
           <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-lime font-bold text-sm uppercase tracking-wider">
                 <Star size={16} fill="currentColor" /> Бонус
              </div>
              
              <div className="space-y-2">
                 <h2 className="text-4xl md:text-6xl font-bold text-white">100 <span className="text-lime">★</span></h2>
                 <p className="text-gray-300 font-medium text-lg">за каждого приглашенного друга</p>
              </div>

              <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-2xl p-2 flex items-center gap-2 border border-white/10">
                 <div className="flex-1 px-4 py-2 font-mono text-sm text-gray-300 truncate">
                    {referralLink}
                 </div>
                 <button 
                    onClick={handleCopy}
                    className="p-3 bg-white text-charcoal rounded-xl hover:bg-lime transition-colors font-bold"
                 >
                    {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                 </button>
              </div>

              <button 
                 onClick={handleInvite}
                 className="w-full max-w-md py-4 bg-lime text-charcoal rounded-2xl font-bold text-lg hover:bg-[#b0e61a] transition-all shadow-glow hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                 <Share2 size={22} /> Пригласить друга
              </button>

              <p className="text-xs text-gray-500 max-w-sm">
                 Друг также получит приветственный бонус 50 ★ при регистрации по вашей ссылке.
              </p>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-surface p-6 md:p-8 rounded-[2rem] shadow-soft border border-gray-50 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
                 <Users size={24} />
              </div>
              <div className="text-3xl font-bold text-charcoal">{stats.count}</div>
              <div className="text-sm text-gray-500 font-medium">Приглашено друзей</div>
           </div>

           <div className="bg-surface p-6 md:p-8 rounded-[2rem] shadow-soft border border-gray-50 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-2">
                 <Star size={24} fill="currentColor" />
              </div>
              <div className="text-3xl font-bold text-charcoal">{stats.earned}</div>
              <div className="text-sm text-gray-500 font-medium">Заработано звезд</div>
           </div>
        </div>

        {/* Info */}
        <div className="bg-gray-50 rounded-3xl p-6 md:p-8 text-center text-sm text-gray-500 leading-relaxed">
           <h3 className="font-bold text-charcoal mb-2">Как это работает?</h3>
           <p>
              1. Скопируйте ссылку или нажмите кнопку "Пригласить друга".<br/>
              2. Отправьте ссылку друзьям в Telegram.<br/>
              3. Когда друг запустит приложение по ссылке, вы получите 100 ★, а друг — 50 ★.
           </p>
        </div>

      </div>
    </div>
  );
};

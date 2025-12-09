
import React from 'react';
import { MessageSquare, ImageIcon, Video, CreditCard, BookOpen, Settings, Zap, Sparkles, Music } from 'lucide-react';
import { ViewState, TelegramUser } from '../types';
import { clsx } from 'clsx';

interface DashboardProps {
  user: TelegramUser | null;
  onNavigate: (view: ViewState) => void;
  balance: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, balance }) => {
  const menuItems = [
    {
      id: 'chat',
      title: 'Чат с AI',
      description: 'GPT-5, Gemini 2.5, Claude',
      icon: MessageSquare,
      color: 'bg-lime text-charcoal',
      hover: 'group-hover:bg-[#b0e61a]'
    },
    {
      id: 'images',
      title: 'Генерация фото',
      description: 'Midjourney, Flux, DALL-E',
      icon: ImageIcon,
      color: 'bg-purple-100 text-purple-600',
      hover: 'group-hover:bg-purple-200'
    },
    {
      id: 'video',
      title: 'Создание видео',
      description: 'Sora 2, Veo, Hailuo',
      icon: Video,
      color: 'bg-red-100 text-red-600',
      hover: 'group-hover:bg-red-200'
    },
    {
      id: 'music',
      title: 'Музыкальная студия',
      description: 'MiniMax Music 2.0',
      icon: Music,
      color: 'bg-pink-100 text-pink-600',
      hover: 'group-hover:bg-pink-200'
    },
    {
      id: 'pricing',
      title: 'Магазин',
      description: 'Пополнить баланс',
      icon: CreditCard,
      color: 'bg-yellow-100 text-yellow-600',
      hover: 'group-hover:bg-yellow-200'
    },
     {
      id: 'docs',
      title: 'Инструкции',
      description: 'Гайды и помощь',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
      hover: 'group-hover:bg-blue-200'
    },
    {
      id: 'profile',
      title: 'Профиль',
      description: 'Настройки и галерея',
      icon: Settings,
      color: 'bg-gray-100 text-gray-600',
      hover: 'group-hover:bg-gray-200'
    }
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full p-4 md:p-8 pt-20 md:pt-10 space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-bold text-charcoal tracking-tight flex items-center gap-3">
              Привет, {user?.first_name || 'Гость'}! <span className="animate-pulse">👋</span>
            </h1>
            <p className="text-gray-500 text-lg font-medium">
              Выберите инструмент для начала работы
            </p>
          </div>
          
          {/* Balance Card - Desktop/Tablet */}
          <div className="hidden md:flex bg-surface rounded-[2rem] p-1.5 pr-6 shadow-soft border border-gray-50 items-center gap-4">
             <div className="bg-charcoal text-lime p-4 rounded-[1.5rem]">
                <Zap size={24} fill="currentColor" />
             </div>
             <div>
                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Баланс</div>
                <div className="text-2xl font-bold text-charcoal">{balance.toLocaleString()} ★</div>
             </div>
             <button 
                onClick={() => onNavigate('pricing')}
                className="ml-4 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-charcoal text-sm transition-colors"
             >
                Пополнить
             </button>
          </div>
        </div>

        {/* Mobile Balance Card */}
        <div className="md:hidden bg-surface rounded-3xl p-5 shadow-soft border border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-charcoal rounded-2xl flex items-center justify-center text-lime">
                  <Zap size={24} fill="currentColor" />
               </div>
               <div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ваш баланс</div>
                  <div className="text-2xl font-bold text-charcoal">{balance.toLocaleString()} ★</div>
               </div>
            </div>
            <button 
               onClick={() => onNavigate('pricing')}
               className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-charcoal text-sm transition-colors"
            >
               +
            </button>
         </div>

        {/* Promo Banner */}
        <div className="relative bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2.5rem] p-6 md:p-10 shadow-xl overflow-hidden text-white group cursor-pointer" onClick={() => onNavigate('chat')}>
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3">
                 <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Sparkles size={12} /> Новинка
                 </div>
                 <h2 className="text-2xl md:text-4xl font-bold">GPT-5 уже доступен</h2>
                 <p className="text-indigo-100 max-w-md text-sm md:text-base">Попробуйте самую мощную модель от OpenAI. Улучшенное понимание контекста и невероятная скорость.</p>
              </div>
              <button className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform hover:bg-indigo-50">
                 Попробовать
              </button>
           </div>
        </div>

        {/* Grid Menu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-8">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              className="bg-surface p-6 md:p-8 rounded-[2rem] shadow-soft border border-gray-50 text-left transition-all hover:-translate-y-1 hover:shadow-lg group flex flex-col gap-4 h-full"
            >
              <div className={clsx("w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-colors", item.color, item.hover)}>
                <item.icon size={32} />
              </div>
              <div>
                 <h3 className="text-xl font-bold text-charcoal mb-1">{item.title}</h3>
                 <p className="text-gray-500 font-medium text-sm">{item.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { TelegramUser } from '../types';
import { User, CreditCard, MessageSquare, Save, Settings, ImageIcon, Video, LayoutGrid, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { Gallery } from './Gallery';

interface ProfileProps {
  user: TelegramUser | null;
  balance: number;
  messageCount: number;
  imageCount: number;
  videoCount?: number;
  sessionsCount: number;
  systemInstruction: string;
  onSaveSystemInstruction: (instruction: string) => void;
  onNavigateToPricing: () => void;
}

export const Profile: React.FC<ProfileProps> = ({
  user,
  balance,
  messageCount,
  imageCount,
  videoCount = 0,
  sessionsCount,
  systemInstruction,
  onSaveSystemInstruction,
  onNavigateToPricing
}) => {
  const [instruction, setInstruction] = useState(systemInstruction);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'gallery'>('stats');

  const handleSave = () => {
    onSaveSystemInstruction(instruction);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full p-4 md:p-6 lg:p-10 pt-16 md:pt-6 space-y-6 md:space-y-8">
        <h1 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight mb-2 md:mb-6">Личный кабинет</h1>

        {/* User Card */}
        <div className="bg-surface rounded-[2rem] p-6 md:p-8 shadow-soft border border-gray-50 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-lime/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-gradient-to-br from-lime to-green-400 flex items-center justify-center text-charcoal font-bold text-3xl shadow-lg shadow-lime/20 flex-shrink-0 relative z-10">
            {user?.first_name?.[0]?.toUpperCase() || <User size={40} />}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-2 relative z-10">
             <h2 className="text-2xl font-bold text-charcoal">{user?.first_name || 'Гость'} {user?.last_name}</h2>
             <div className="text-gray-500 font-medium">@{user?.username || 'guest'}</div>
             <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 uppercase tracking-wider">
               ID: {user?.id || 'LOCAL_USER'}
             </div>
          </div>
          
          <div className="bg-lime/10 p-4 rounded-2xl min-w-[140px] text-center md:text-right relative z-10">
             <div className="text-xs font-bold text-lime-700 uppercase mb-1">Баланс</div>
             <div className="text-3xl font-bold text-charcoal">{balance.toLocaleString()}</div>
             <div className="text-xs font-bold text-gray-400 uppercase mt-1">Звезд</div>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="flex gap-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('stats')}
            className={clsx(
              "pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'stats' ? "border-lime text-charcoal" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <BarChart3 size={18} /> Статистика
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={clsx(
              "pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2",
              activeTab === 'gallery' ? "border-lime text-charcoal" : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutGrid size={18} /> Галерея
          </button>
        </div>

        {activeTab === 'stats' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-surface p-6 rounded-[2rem] shadow-soft border border-gray-50 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                     <MessageSquare size={24} />
                  </div>
                  <div>
                     <div className="text-2xl font-bold text-charcoal">{messageCount}</div>
                     <div className="text-sm text-gray-500 font-medium">Сообщений</div>
                  </div>
               </div>
               
               <div className="bg-surface p-6 rounded-[2rem] shadow-soft border border-gray-50 flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                     <ImageIcon size={24} />
                  </div>
                  <div>
                     <div className="text-2xl font-bold text-charcoal">{imageCount}</div>
                     <div className="text-sm text-gray-500 font-medium">Изображений</div>
                  </div>
               </div>

               <div className="bg-surface p-6 rounded-[2rem] shadow-soft border border-gray-50 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                     <Video size={24} />
                  </div>
                  <div>
                     <div className="text-2xl font-bold text-charcoal">{videoCount}</div>
                     <div className="text-sm text-gray-500 font-medium">Видео</div>
                  </div>
               </div>
               
               <div 
                 className="bg-surface p-6 rounded-[2rem] shadow-soft border border-gray-50 flex items-center gap-4 cursor-pointer hover:border-lime transition-all hover:shadow-lg active:scale-[0.98]" 
                 onClick={onNavigateToPricing}
               >
                  <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center">
                     <CreditCard size={24} />
                  </div>
                  <div>
                     <div className="text-lg font-bold text-charcoal text-lime-700 underline decoration-lime/50 underline-offset-2">Пополнить</div>
                     <div className="text-sm text-gray-500 font-medium">Купить звезды</div>
                  </div>
               </div>
            </div>

            {/* Settings Section */}
            <div className="bg-surface rounded-[2rem] p-6 md:p-8 shadow-soft border border-gray-50 space-y-6">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-charcoal">
                     <Settings size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-charcoal">Настройки AI</h3>
               </div>
               
               <div>
                  <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">
                     Системная инструкция (Persona)
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                     Задайте роль или правила поведения для нейросети. Например: "Ты опытный юрист", "Отвечай смешно", "Ты учитель английского".
                  </p>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="Введите инструкцию..."
                    className="w-full bg-gray-50 text-charcoal rounded-2xl p-4 min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-lime/50 border border-gray-200 text-base shadow-inner"
                  />
               </div>
               
               <div className="flex justify-end">
                  <button 
                    onClick={handleSave}
                    className={clsx(
                       "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
                       isSaved 
                        ? "bg-green-500 text-white shadow-lg scale-105" 
                        : "bg-charcoal text-white hover:bg-black hover:scale-105 active:scale-95 shadow-lg shadow-charcoal/20"
                    )}
                  >
                     <Save size={18} />
                     {isSaved ? 'Сохранено!' : 'Сохранить'}
                  </button>
               </div>
            </div>
          </>
        ) : (
          <Gallery user={user} />
        )}
      </div>
    </div>
  );
};

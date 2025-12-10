
import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { Download, Play, Image as ImageIcon, Film, X, Send, RefreshCw, Music } from 'lucide-react';
import { clsx } from 'clsx';
import { TelegramUser } from '../types';

interface GalleryProps {
  user: TelegramUser | null;
}

export const Gallery: React.FC<GalleryProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'music'>('images');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadContent();
    }
  }, [user, activeTab]);

  const loadContent = async () => {
    if (!user) return;
    setLoading(true);
    // Cast activeTab to match the expected union type in userService
    const type = activeTab === 'images' ? 'image' : activeTab === 'videos' ? 'video' : 'music';
    const data = await userService.getUserContent(user.id, type);
    setItems(data);
    setLoading(false);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('Download failed', e);
      // Fallback
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSendToChat = async () => {
    if (!selectedItem || !user) return;
    setIsSending(true);
    
    let apiEndpoint = '/api/send-image';
    if (activeTab === 'videos') apiEndpoint = '/api/send-video';
    // For music, assuming same endpoint logic or specialized one. 
    // Since we don't have api/send-music, we'll assume the generated-music background process handles delivery.
    // But if we want to resend:
    // We need a /api/send-audio endpoint. For now, let's reuse video endpoint logic or disable button for music if not ready.
    // Actually, let's just create a generic handler in thoughts, but for now reuse video endpoint if compatible (unlikely) 
    // or just show alert that music resend is not implemented yet or implement it.
    // Let's implement basic audio resend using send-video logic but pointing to sendAudio (would need new endpoint).
    // For now, disabling send button for music to avoid errors.

    const body: any = {
          userId: user.id,
          caption: `Prompt: ${selectedItem.prompt}\n(из галереи UniAI)`
    };

    if (activeTab === 'images') {
        body.imageUrl = selectedItem.url;
    } else if (activeTab === 'videos') {
        body.videoUrl = selectedItem.url;
    } else {
        alert("Повторная отправка музыки пока не доступна.");
        setIsSending(false);
        return;
    }
    
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (data.success) {
         if ((window as any).Telegram?.WebApp) {
             (window as any).Telegram.WebApp.showPopup({
                 title: 'Готово!',
                 message: 'Отправлено в чат.',
                 buttons: [{type: 'ok'}]
             });
         } else {
             alert('Отправлено!');
         }
      } else {
         alert('Ошибка отправки: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      console.error(e);
      alert('Не удалось отправить. Попробуйте еще раз.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex p-1 bg-gray-50 rounded-2xl w-fit border border-gray-100 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('images')}
          className={clsx(
            "px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'images' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
          )}
        >
          <ImageIcon size={18} /> Фото
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={clsx(
            "px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'videos' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
          )}
        >
          <Film size={18} /> Видео
        </button>
        <button
          onClick={() => setActiveTab('music')}
          className={clsx(
            "px-4 md:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'music' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
          )}
        >
          <Music size={18} /> Музыка
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
             {activeTab === 'images' ? <ImageIcon size={32} /> : activeTab === 'videos' ? <Film size={32} /> : <Music size={32} />}
          </div>
          <p className="text-gray-500 font-medium">Здесь пока пусто</p>
          <p className="text-sm text-gray-400 mt-1">
             {activeTab === 'music' ? 'Создайте трек' : `Сгенерируйте ${activeTab === 'images' ? 'изображение' : 'видео'}`}, чтобы оно появилось здесь.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={clsx(
                  "group relative bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-gray-100",
                  activeTab === 'music' ? "aspect-auto h-32 flex flex-col justify-between p-4 bg-white" : "aspect-square"
              )}
              onClick={() => setSelectedItem(item)}
            >
              {activeTab === 'images' ? (
                <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
              ) : activeTab === 'videos' ? (
                <video src={item.url} className="w-full h-full object-cover" />
              ) : (
                // Music Item Card
                <>
                    <div className="flex items-start justify-between">
                         <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center">
                             <Music size={20} />
                         </div>
                         <span className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-charcoal line-clamp-2 leading-tight">{item.prompt}</h4>
                    </div>
                </>
              )}

              {activeTab !== 'music' && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     {activeTab === 'videos' && <Play className="text-white fill-white" size={32} />}
                     <div className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors" title="Открыть">
                        {activeTab === 'images' ? <ImageIcon size={16} /> : <Film size={16} />}
                     </div>
                  </div>
              )}
              
              {activeTab !== 'music' && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    {item.prompt}
                  </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
          <div className="bg-surface rounded-3xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-surface">
               <div className="font-bold text-charcoal truncate pr-4 text-sm md:text-base">{selectedItem.prompt}</div>
               <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full text-charcoal transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative p-4">
               {activeTab === 'images' ? (
                 <img src={selectedItem.url} alt={selectedItem.prompt} className="max-w-full max-h-[60vh] object-contain shadow-lg" />
               ) : activeTab === 'videos' ? (
                 <video src={selectedItem.url} controls autoPlay className="max-w-full max-h-[60vh] shadow-lg rounded-lg" />
               ) : (
                 <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center text-center">
                     <div className="w-24 h-24 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-6 shadow-glow animate-pulse">
                         <Music size={48} />
                     </div>
                     <h3 className="text-xl font-bold text-charcoal mb-2">Музыкальный трек</h3>
                     <p className="text-sm text-gray-500 mb-6 line-clamp-3">{selectedItem.prompt}</p>
                     <audio src={selectedItem.url} controls className="w-full" />
                 </div>
               )}
            </div>
            <div className="p-4 bg-surface border-t border-gray-100 flex justify-end gap-3">
               {user && activeTab !== 'music' ? (
                   <button 
                     onClick={handleSendToChat}
                     disabled={isSending}
                     className="flex items-center gap-2 px-6 py-3 bg-charcoal text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-charcoal/20 active:scale-95 disabled:opacity-70"
                   >
                     {isSending ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />} 
                     {isSending ? 'Отправка...' : 'Отправить в бот'}
                   </button>
               ) : (
                   <button 
                     onClick={() => handleDownload(selectedItem.url, `uniai-${activeTab}-${Date.now()}.${activeTab === 'images' ? 'png' : activeTab === 'videos' ? 'mp4' : 'mp3'}`)}
                     className="flex items-center gap-2 px-6 py-3 bg-charcoal text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-charcoal/20 active:scale-95"
                   >
                     <Download size={18} /> Скачать
                   </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { Download, Play, Image as ImageIcon, Film, X, Send, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { TelegramUser } from '../types';

interface GalleryProps {
  user: TelegramUser | null;
}

export const Gallery: React.FC<GalleryProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
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
    const data = await userService.getUserContent(user.id, activeTab === 'images' ? 'image' : 'video');
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
    
    const apiEndpoint = activeTab === 'images' ? '/api/send-image' : '/api/send-video';
    const body: any = {
          userId: user.id,
          caption: `Prompt: ${selectedItem.prompt}\n(из галереи UniAI)`
    };

    if (activeTab === 'images') {
        body.imageUrl = selectedItem.url;
    } else {
        body.videoUrl = selectedItem.url;
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
      <div className="flex p-1 bg-gray-50 rounded-2xl w-fit border border-gray-100">
        <button
          onClick={() => setActiveTab('images')}
          className={clsx(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'images' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
          )}
        >
          <ImageIcon size={18} /> Изображения
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          className={clsx(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'videos' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
          )}
        >
          <Film size={18} /> Видео
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
             {activeTab === 'images' ? <ImageIcon size={32} /> : <Film size={32} />}
          </div>
          <p className="text-gray-500 font-medium">Здесь пока пусто</p>
          <p className="text-sm text-gray-400 mt-1">Сгенерируйте {activeTab === 'images' ? 'изображение' : 'видео'}, чтобы оно появилось здесь.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-gray-100"
              onClick={() => setSelectedItem(item)}
            >
              {activeTab === 'images' ? (
                <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
              ) : (
                <video src={item.url} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 {activeTab === 'videos' && <Play className="text-white fill-white" size={32} />}
                 <div className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors" title="Открыть">
                    {activeTab === 'images' ? <ImageIcon size={16} /> : <Film size={16} />}
                 </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                {item.prompt}
              </div>
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
            <div className="flex-1 bg-gray-50 flex items-center justify-center overflow-hidden relative">
               {activeTab === 'images' ? (
                 <img src={selectedItem.url} alt={selectedItem.prompt} className="max-w-full max-h-[60vh] object-contain shadow-lg" />
               ) : (
                 <video src={selectedItem.url} controls autoPlay className="max-w-full max-h-[60vh] shadow-lg rounded-lg" />
               )}
            </div>
            <div className="p-4 bg-surface border-t border-gray-100 flex justify-end gap-3">
               {user ? (
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
                     onClick={() => handleDownload(selectedItem.url, `uniai-${activeTab}-${Date.now()}.${activeTab === 'images' ? 'png' : 'mp4'}`)}
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

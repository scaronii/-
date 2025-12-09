
import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Video, Play, Clock, Sparkles, Film, Paperclip, X, Send } from 'lucide-react';
import { VIDEO_MODELS } from '../constants';
import { generateVideo, pollVideoStatus, getVideoContent } from '../services/geminiService';
import { clsx } from 'clsx';
import { TelegramUser } from '../types';
import { userService } from '../services/userService';

interface VideoGeneratorProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  tgUser: TelegramUser | null;
  onVideoGenerated?: () => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ balance, onUpdateBalance, tgUser, onVideoGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState('1280x720'); // Landscape
  const [duration, setDuration] = useState<4 | 6 | 8 | 10>(6); // Default 6s
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modelInfo = VIDEO_MODELS.find(m => m.id === selectedModel);
  const costPerSecond = modelInfo?.cost || 35;
  const totalCost = costPerSecond * duration;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        setAttachment({
          name: file.name,
          mimeType: file.type,
          data: base64Data
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleDownload = async (url: string) => {
     try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `uniai-video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch (e) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `uniai-video-${Date.now()}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleSendToChat = async () => {
    if (!generatedVideo || !tgUser) return;
    
    setIsSending(true);

    try {
      const res = await fetch('/api/send-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tgUser.id,
          videoUrl: generatedVideo,
          caption: `Prompt: ${prompt}\nModel: ${VIDEO_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}`
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
         if ((window as any).Telegram?.WebApp) {
             (window as any).Telegram.WebApp.showPopup({
                 title: 'Готово!',
                 message: 'Видео отправлено вам в чат.',
                 buttons: [{type: 'ok'}]
             });
         } else {
             alert('Видео отправлено вам в чат!');
         }
      } else {
         alert('Ошибка отправки: ' + (data.error || 'Unknown'));
      }
    } catch (e) {
      console.error(e);
      alert('Не удалось отправить видео. Попробуйте еще раз.');
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && !attachment) return;
    if (balance < totalCost) {
       setError(`Недостаточно средств. Стоимость: ${totalCost} ★`);
       return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);
    setProgress(0);
    setStatus('queued');

    try {
      // 1. Deduct tokens first
      if (tgUser) {
         const newBal = await userService.deductTokens(tgUser.id, totalCost);
         if (newBal !== undefined) onUpdateBalance(newBal);
      } else {
         onUpdateBalance(balance - totalCost);
      }

      // 2. Start generation
      const currentAttachment = attachment ? { mimeType: attachment.mimeType, data: attachment.data } : undefined;
      
      // Returns { id: "task_id" }
      const task = await generateVideo(selectedModel, prompt || "Video based on image", aspectRatio, duration, currentAttachment);
      
      // Clear attachment
      setAttachment(null);

      // 3. Poll for status
      let attempts = 0;
      const pollInterval = setInterval(async () => {
         attempts++;
         // Timeout after ~5 minutes (300 seconds)
         if (attempts > 100) {
             clearInterval(pollInterval);
             setError("Превышено время ожидания генерации.");
             setIsGenerating(false);
             return;
         }

         try {
            const result = await pollVideoStatus(task.id);
            
            if (result.status === 'processing') {
                setStatus('processing');
                // Fake smooth progress while processing
                setProgress(prev => prev < 90 ? prev + (5 / attempts) : 90);
            }
            
            if (result.status === 'completed' && result.fileId) {
               clearInterval(pollInterval);
               setStatus('completed');
               setProgress(100);
               
               // 4. Get Content using fileId
               const videoUrl = await getVideoContent(result.fileId);
               setGeneratedVideo(videoUrl);
               setIsGenerating(false);
               
               // Save to DB
               if (tgUser) {
                  userService.saveGeneratedVideo(tgUser.id, videoUrl, prompt || "Image-to-Video", selectedModel);
                  if (onVideoGenerated) onVideoGenerated();
               }
            } else if (result.status === 'failed') {
               clearInterval(pollInterval);
               throw new Error("Генерация отменена сервером");
            }
         } catch (e) {
            console.error(e);
            clearInterval(pollInterval);
            setError("Ошибка при создании видео. Попробуйте другой промпт.");
            setIsGenerating(false);
         }
      }, 3000); // Poll every 3 seconds

    } catch (err: any) {
      setError(err.message || 'Ошибка запуска генерации');
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 pt-16 md:pt-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-charcoal mb-2 flex items-center gap-3">
              <span className="w-10 h-10 md:w-12 md:h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                <Video size={24} />
              </span>
              Генерация Видео
            </h1>
            <p className="text-gray-500 text-sm md:text-base font-medium">Создавайте клипы с помощью Sora 2. Процесс может занять несколько минут.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-sm font-medium text-gray-500 w-fit">
             Баланс: <span className="text-charcoal font-bold">{balance.toLocaleString()}</span> ★
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface p-5 md:p-6 rounded-[2rem] shadow-soft border border-gray-50 space-y-6">
              <div>
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Модель</label>
                <div className="relative">
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-gray-50 text-charcoal font-medium border border-gray-200 rounded-2xl px-5 py-3.5 appearance-none focus:ring-2 focus:ring-lime focus:outline-none transition-all cursor-pointer hover:bg-gray-100 text-sm md:text-base"
                  >
                    {VIDEO_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.cost} ★/сек)</option>
                    ))}
                  </select>
                </div>
                {modelInfo?.description && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
                    <Sparkles size={14} className="mt-0.5 text-red-500" />
                    {modelInfo.description}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Формат</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAspectRatio('1280x720')}
                    className={clsx(
                      "py-3 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2",
                      aspectRatio === '1280x720'
                        ? "bg-charcoal border-charcoal text-white shadow-md" 
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="w-5 h-3 border-2 border-current rounded-sm"></div>
                    16:9
                  </button>
                  <button
                    onClick={() => setAspectRatio('720x1280')}
                    className={clsx(
                      "py-3 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2",
                      aspectRatio === '720x1280'
                        ? "bg-charcoal border-charcoal text-white shadow-md" 
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="w-3 h-5 border-2 border-current rounded-sm"></div>
                    9:16
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Длительность</label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 6, 8, 10].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDuration(s as 4|6|8|10)}
                      className={clsx(
                        "py-3 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2",
                        duration === s
                          ? "bg-charcoal border-charcoal text-white shadow-md" 
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {s} сек
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <div className="flex justify-between items-center bg-red-50 p-4 rounded-2xl">
                    <span className="text-sm font-bold text-red-800">Стоимость</span>
                    <span className="text-charcoal font-bold">{totalCost} ★</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface p-2 rounded-[2.5rem] shadow-soft border border-gray-50 relative">
               {/* Attachment Preview */}
               {attachment && (
                <div className="absolute bottom-full left-4 mb-3 bg-surface rounded-2xl p-3 flex items-center gap-3 shadow-lg border border-gray-100 animate-fadeIn z-10">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden">
                     <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 max-w-[150px]">
                    <div className="text-sm font-bold truncate text-charcoal">{attachment.name}</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={removeAttachment}
                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите видео (сцена, движение, освещение)..."
                className="w-full bg-transparent text-charcoal placeholder-gray-400 resize-none p-6 text-base md:text-lg focus:outline-none min-h-[120px] md:min-h-[140px] rounded-[2rem]"
              />
              <div className="flex flex-col sm:flex-row items-center justify-end px-4 pb-4 gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto mr-auto">
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*"
                   />
                   <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={clsx(
                         "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full transition-all hover:scale-105",
                         attachment ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                      title="Прикрепить фото для анимации"
                   >
                      <Paperclip size={20} />
                   </button>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={(!prompt && !attachment) || isGenerating}
                  className="w-full sm:w-auto bg-charcoal hover:bg-black text-white px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:scale-105 active:scale-95 text-base"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Film size={20} />}
                  Создать видео ({totalCost} ★)
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-[2rem] md:rounded-[3rem] border border-gray-50 shadow-soft min-h-[300px] md:min-h-[500px] flex items-center justify-center relative overflow-hidden group p-4">
              {isGenerating ? (
                <div className="text-center space-y-6 w-full max-w-md">
                  <div className="relative mx-auto w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-charcoal font-bold text-lg animate-pulse">Генерация видео: {status}</p>
                     <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                     </div>
                     <p className="text-xs text-gray-500">Это может занять несколько минут. Не закрывайте вкладку.</p>
                  </div>
                </div>
              ) : generatedVideo ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <video 
                     src={generatedVideo} 
                     controls 
                     autoPlay 
                     loop 
                     className="max-w-full max-h-[500px] rounded-[2rem] shadow-lg"
                  />
                  <div className="absolute bottom-6 right-6 flex gap-3">
                     {tgUser && (
                        <button 
                          onClick={handleSendToChat}
                          disabled={isSending}
                          className="bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                          {isSending ? (
                              <RefreshCw className="animate-spin w-5 h-5" />
                          ) : (
                              <Send className="w-5 h-5" />
                          )}
                          <span className="text-sm font-bold hidden sm:inline">
                              {isSending ? 'Отправка...' : 'В бот'}
                          </span>
                        </button>
                     )}
                     <button 
                       onClick={() => handleDownload(generatedVideo!)}
                       className="bg-white text-charcoal p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                     >
                       <Download size={24} />
                     </button>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 text-red-500 text-center p-6 md:p-8 rounded-3xl max-w-md mx-4">
                  <p className="font-bold">{error}</p>
                </div>
              ) : (
                <div className="text-center text-gray-300">
                  <Film size={80} className="mx-auto mb-6 opacity-30" />
                  <p className="text-xl font-medium">Результат будет здесь</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

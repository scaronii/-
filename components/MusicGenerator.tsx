
import React, { useState } from 'react';
import { Music, Disc, Download, RefreshCw, Wand2, Mic2, Sparkles, Globe, CheckCircle2 } from 'lucide-react';
import { streamChatResponse } from '../services/geminiService';
import { userService } from '../services/userService';
import { TelegramUser } from '../types';
import { clsx } from 'clsx';
import { MUSIC_MODELS } from '../constants';

interface MusicGeneratorProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  tgUser: TelegramUser | null;
}

const EXAMPLE_LYRICS = `[Verse 1]
Neon lights on the wet pavement
Walking alone in this digital rain
Searching for a signal, a connection

[Chorus]
Cyber heart, beating in code
Can you hear the rhythm of the data flow?
Cyber heart, lost in the mode
Running through the wires, nowhere to go`;

export const MusicGenerator: React.FC<MusicGeneratorProps> = ({ balance, onUpdateBalance, tgUser }) => {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsLanguage, setLyricsLanguage] = useState('Russian');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modelInfo = MUSIC_MODELS.find(m => m.id === 'music-2.0');
  const COST = modelInfo?.cost || 0;

  const handleGenerateLyrics = async () => {
    if (!prompt) {
        setError("Сначала опишите стиль и настроение для генерации текста");
        return;
    }
    
    setIsGeneratingLyrics(true);
    setLyrics(''); // Reset lyrics
    setError(null);

    try {
      await streamChatResponse({
        modelId: 'google/gemini-2.5-flash',
        history: [],
        message: `Напиши текст песни на основе этого стиля/настроения: "${prompt}". 
        Язык текста: ${lyricsLanguage}.
        Используй структуру [Verse], [Chorus], [Bridge] и т.д.
        Текст должен быть ритмичным и подходить под жанр.
        Выводи ТОЛЬКО текст песни без лишних слов и вступлений.`,
        systemInstruction: "Ты профессиональный автор песен. Ты пишешь качественные, рифмованные тексты с четкой структурой.",
        onChunk: (chunk) => setLyrics(prev => prev + chunk)
      });
    } catch (e: any) {
      console.error("Lyrics gen error", e);
      setError("Не удалось сгенерировать текст: " + e.message);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt || !lyrics) return;
    
    // Only check balance if cost > 0
    if (COST > 0 && balance < COST) {
       alert(`Недостаточно средств. Стоимость: ${COST} ★`);
       return;
    }

    if (!tgUser) {
        alert("Для фоновой генерации нужно открыть приложение в Telegram.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Списание баланса (если платно)
      if (COST > 0) {
         const newBal = await userService.deductTokens(tgUser.id, COST);
         if (newBal !== undefined) onUpdateBalance(newBal);
      }

      // 2. Отправка запроса на сервер
      const response = await fetch('/api/generate-music-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              prompt,
              lyrics,
              userId: tgUser.id,
              model: 'music-2.0'
          })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
          throw new Error(data.error || "Ошибка запуска генерации");
      }

      // 3. Успешный запуск
      setSuccessMessage("Генерация началась! Вы можете закрыть это окно. Бот пришлет вам песню через 1-2 минуты.");
      
    } catch (err: any) {
      setError(err.message || 'Ошибка генерации музыки');
      // Возврат средств при ошибке запуска (упрощенно)
      if (COST > 0) onUpdateBalance(balance); 
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        
        {/* Header - Removed local balance and model name */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-charcoal flex items-center gap-3">
              <span className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center">
                <Music size={24} />
              </span>
              Музыкальная Студия
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Создавайте уникальные треки с вокалом</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-gray-50 space-y-5">
              
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2 ml-1">Стиль и настроение</label>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Например: Synthwave 80s, melancholic, male vocals..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-pink-500/50 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-end justify-between mb-2 ml-1 gap-2">
                    <label className="block text-sm font-bold text-charcoal flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span>Текст песни</span>
                        <span className="text-xs font-normal text-gray-400 hidden sm:inline">Теги: [Verse], [Chorus]</span>
                    </label>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Globe size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={lyricsLanguage}
                                onChange={(e) => setLyricsLanguage(e.target.value)}
                                className="appearance-none bg-gray-50 border border-gray-200 text-xs font-bold pl-8 pr-6 py-2 rounded-xl outline-none focus:ring-2 focus:ring-pink-500/50 text-charcoal cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                                <option value="Russian">RU</option>
                                <option value="English">EN</option>
                                <option value="Spanish">ES</option>
                                <option value="French">FR</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">▼</div>
                        </div>

                        <button
                            onClick={handleGenerateLyrics}
                            disabled={isGeneratingLyrics || !prompt}
                            className={clsx(
                                "text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95",
                                !prompt 
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                : "bg-pink-50 text-pink-600 hover:bg-pink-100 shadow-sm"
                            )}
                            title={!prompt ? "Сначала заполните стиль" : "Сгенерировать текст"}
                        >
                            {isGeneratingLyrics ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            {isGeneratingLyrics ? 'Пишем...' : 'Сгенерировать'}
                        </button>
                    </div>
                </div>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={EXAMPLE_LYRICS}
                  className="w-full h-64 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-pink-500/50 outline-none resize-none font-mono text-sm leading-relaxed"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt || !lyrics || isGeneratingLyrics || !!successMessage}
                className="w-full bg-charcoal text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-charcoal/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isGenerating ? <RefreshCw className="animate-spin" /> : <Wand2 />}
                {isGenerating ? 'Запуск генерации...' : (COST > 0 ? `Создать трек (${COST} ★)` : 'Создать трек (Бесплатно)')}
              </button>
            </div>
          </div>

          {/* Result Info */}
          <div className="lg:col-span-5">
             <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-gray-50 h-full flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
                
                {successMessage ? (
                   <div className="text-center animate-fadeIn px-4">
                      <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                          <CheckCircle2 size={48} />
                      </div>
                      <h3 className="text-2xl font-bold text-charcoal mb-4">В процессе!</h3>
                      <p className="text-gray-600 font-medium mb-6 leading-relaxed">
                        {successMessage}
                      </p>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">
                         Можно закрыть приложение
                      </p>
                   </div>
                ) : (
                   <div className="text-center text-gray-300">
                    <div className="relative mx-auto mb-6 w-32 h-32 opacity-20">
                         <Disc className="w-full h-full text-charcoal animate-[spin_20s_linear_infinite]" />
                    </div>
                    <p className="text-lg font-medium">Здесь появится статус</p>
                    <p className="text-sm mt-2 max-w-[200px] mx-auto opacity-60">Заполните поля и нажмите кнопку. Результат придет в бот.</p>
                  </div>
                )}

                {error && (
                   <div className="absolute bottom-6 left-6 right-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-bold text-center border border-red-100">
                     {error}
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

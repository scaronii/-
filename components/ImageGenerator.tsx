
import React, { useState } from 'react';
import { Download, RefreshCw, Wand2, Image as ImageIconSmall, Clock, Sparkles } from 'lucide-react';
import { IMAGE_MODELS } from '../constants';
import { generateImage } from '../services/geminiService';
import { clsx } from 'clsx';
import { TelegramUser } from '../types';
import { userService } from '../services/userService';

interface ImageGeneratorProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  tgUser: TelegramUser | null;
}

const RANDOM_PROMPTS = [
  "Футуристический город в стиле киберпанк, неоновые огни, дождь, 4k",
  "Милый кот-космонавт на Марсе, цифровая живопись",
  "Портрет девушки в стиле Ренессанс с кибернетическими деталями",
  "Логотип кофейни в стиле минимализм, векторная графика",
  "Древний храм в джунглях, пробивающиеся лучи солнца, фотореализм",
  "Изометрическая комната геймера с RGB подсветкой",
  "Сюрреалистичный пейзаж с летающими островами и водопадами"
];

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ balance, onUpdateBalance, tgUser }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{url: string, prompt: string}[]>([]);

  const modelInfo = IMAGE_MODELS.find(m => m.id === selectedModel);
  const cost = modelInfo?.cost || 50;

  const handleRandomPrompt = () => {
    const random = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
    setPrompt(random);
  };

  const handleGenerate = async () => {
    if (!prompt) return;

    if (balance < cost) {
       setError(`Недостаточно средств. Стоимость: ${cost} ★`);
       return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImage(selectedModel, `Draw the following: ${prompt}`, aspectRatio);
      if (result.url) {
        setGeneratedImage(result.url);
        setHistory(prev => [{ url: result.url!, prompt }, ...prev]);
        
        // Deduct balance
        if (tgUser) {
           const newBal = await userService.deductTokens(tgUser.id, cost);
           if (newBal !== undefined) onUpdateBalance(newBal);
        } else {
           // Local demo mode
           onUpdateBalance(balance - cost);
        }

      } else {
        setError('Не удалось создать изображение. Попробуйте другой запрос.');
      }
    } catch (err) {
      setError('Ошибка генерации. Проверьте соединение или выберите другую модель.');
    } finally {
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
              <span className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <Wand2 size={24} />
              </span>
              Генерация Изображений
            </h1>
            <p className="text-gray-500 text-sm md:text-base font-medium">Создавайте искусство с помощью Nano Banana Pro, Flux и других.</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-sm font-medium text-gray-500 w-fit">
             Баланс: <span className="text-charcoal font-bold">{balance.toLocaleString()}</span> ★
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Left Panel: Settings */}
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
                    {IMAGE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.cost} ★)</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {modelInfo?.description && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">
                    <Sparkles size={14} className="mt-0.5 text-purple-500" />
                    {modelInfo.description}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wider">Формат</label>
                <div className="grid grid-cols-3 gap-2">
                  {['1:1', '16:9', '9:16'].map(ratio => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={clsx(
                        "py-3 rounded-2xl text-sm font-bold border transition-all",
                        aspectRatio === ratio 
                          ? "bg-charcoal border-charcoal text-white shadow-md" 
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <div className="flex justify-between items-center bg-lime/10 p-4 rounded-2xl">
                    <span className="text-sm font-bold text-lime-800">Стоимость</span>
                    <span className="text-charcoal font-bold">{cost} ★</span>
                 </div>
              </div>
            </div>

            {/* History Mini View */}
            {history.length > 0 && (
               <div className="space-y-4 px-2">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                   <Clock size={14} /> Недавние
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                   {history.slice(0, 4).map((item, idx) => (
                     <div key={idx} className="aspect-square rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm border border-gray-100 hover:shadow-md transition-all" onClick={() => setGeneratedImage(item.url)}>
                       <img src={item.url} alt="history" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-charcoal/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                   ))}
                 </div>
               </div>
            )}
          </div>

          {/* Right Panel: Prompt & Result */}
          <div className="lg:col-span-8 space-y-6">
            {/* Prompt Input */}
            <div className="bg-surface p-2 rounded-[2.5rem] shadow-soft border border-gray-50">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите изображение детально..."
                className="w-full bg-transparent text-charcoal placeholder-gray-400 resize-none p-6 text-base md:text-lg focus:outline-none min-h-[120px] md:min-h-[140px] rounded-[2rem]"
              />
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 pb-4 gap-4">
                <button 
                  onClick={handleRandomPrompt}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors w-full sm:w-auto"
                >
                  Случайный промпт
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt || isGenerating}
                  className="w-full sm:w-auto bg-lime hover:bg-[#b0e61a] text-charcoal px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow hover:scale-105 active:scale-95 text-base"
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />}
                  Создать ({cost} ★)
                </button>
              </div>
            </div>

            {/* Result Area */}
            <div className="bg-surface rounded-[2rem] md:rounded-[3rem] border border-gray-50 shadow-soft min-h-[300px] md:min-h-[500px] flex items-center justify-center relative overflow-hidden group p-4">
              {isGenerating ? (
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-gray-100"></div>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-lime border-t-transparent animate-spin absolute top-0 left-0"></div>
                  </div>
                  <p className="text-charcoal font-bold animate-pulse text-lg">Нейросеть творит...</p>
                </div>
              ) : generatedImage ? (
                <>
                  <img src={generatedImage} alt="Generated" className="w-full h-full object-contain rounded-[2rem]" />
                  <div className="absolute bottom-6 right-6 flex gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                    <a 
                      href={generatedImage} 
                      download="generated-image.png"
                      className="bg-white text-charcoal p-3 md:p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <Download size={20} md:size={24} />
                    </a>
                  </div>
                </>
              ) : error ? (
                <div className="bg-red-50 text-red-500 text-center p-6 md:p-8 rounded-3xl max-w-md mx-4">
                  <p className="font-bold text-sm md:text-base">{error}</p>
                </div>
              ) : (
                <div className="text-center text-gray-300">
                  <ImageIconSmall size={60} md:size={80} className="mx-auto mb-4 md:mb-6 opacity-30" />
                  <p className="text-lg md:text-xl font-medium">Здесь появится шедевр</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

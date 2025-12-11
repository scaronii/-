
import React, { useState, useRef, useEffect } from 'react';
import { Mic2, Upload, Play, Loader2, Sparkles, Volume2, Trash2, CheckCircle2, AlertCircle, Download, Square, Mic, RefreshCw } from 'lucide-react';
import { TelegramUser } from '../types';
import { userService } from '../services/userService';
import { clsx } from 'clsx';

interface VoiceCloningProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  tgUser: TelegramUser | null;
}

interface SavedVoice {
    id: string;
    name: string;
    date: number;
}

// Ценообразование
const CLONE_COST = 250; // Стоимость создания слепка
const TTS_BASE_COST = 50; // Базовая стоимость озвучки (до 1000 знаков)
const TTS_EXTRA_COST = 10; // За каждые следующие 1000 знаков

export const VoiceCloning: React.FC<VoiceCloningProps> = ({ balance, onUpdateBalance, tgUser }) => {
  // Mode State
  const [activeTab, setActiveTab] = useState<'new' | 'saved'>('new');
  const [inputType, setInputType] = useState<'file' | 'mic'>('mic');

  // Input Data State
  const [file, setFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [text, setText] = useState('Привет! Это мой клонированный голос, созданный с помощью UniAI.');
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved voices
  useEffect(() => {
      const saved = localStorage.getItem('uniai_voices');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              setSavedVoices(parsed);
              if (parsed.length > 0) setActiveTab('saved');
          } catch (e) {}
      }
  }, []);

  // Timer logic for recording
  useEffect(() => {
      if (isRecording) {
          timerRef.current = window.setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
      };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCost = () => {
      let cost = 0;
      // Если создаем новый голос
      if (activeTab === 'new') {
          cost += CLONE_COST;
      }
      
      // Стоимость озвучки текста
      cost += TTS_BASE_COST;
      
      if (text.length > 1000) {
          const extraThousands = Math.ceil((text.length - 1000) / 1000);
          cost += extraThousands * TTS_EXTRA_COST;
      }
      
      return cost;
  };

  const saveVoiceLocally = (id: string, name: string) => {
      const newVoice = { id, name, date: Date.now() };
      const newVoices = [newVoice, ...savedVoices];
      setSavedVoices(newVoices);
      localStorage.setItem('uniai_voices', JSON.stringify(newVoices));
      return newVoice;
  };

  const deleteVoice = (id: string) => {
      const newVoices = savedVoices.filter(v => v.id !== id);
      setSavedVoices(newVoices);
      localStorage.setItem('uniai_voices', JSON.stringify(newVoices));
      if (selectedVoiceId === id) setSelectedVoiceId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
          alert("Файл слишком большой. Максимум 20 МБ.");
          return;
      }
      setFile(selectedFile);
      setRecordedBlob(null); // Clear recording if file selected
      setResultAudioUrl(null);
    }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/mp3' }); // Browser will likely save as webm/ogg, but we label as we prefer
              setRecordedBlob(blob);
              setFile(null); // Clear file if recording exists
              
              // Stop all tracks
              stream.getTracks().forEach(track => track.stop());
          };

          recorder.start();
          setIsRecording(true);
          setRecordingTime(0);
          setRecordedBlob(null);
      } catch (e) {
          console.error(e);
          alert("Не удалось получить доступ к микрофону");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const hexToBlobUrl = (hex: string) => {
    const cleanHex = hex.replace(/[\s\n\r"']+/g, '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  };
  
  // Helper to convert Blob URL to Base64 for sending to API
  const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const sendToTelegram = async (audioBlobUrl: string) => {
      if (!tgUser) return;
      try {
          const base64Data = await blobUrlToBase64(audioBlobUrl);
          await fetch('/api/send-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  userId: tgUser.id,
                  audioUrl: base64Data,
                  caption: `🎙 Клонированный голос: ${voiceName || (selectedVoiceId ? 'Из сохраненных' : 'Голос')}\n💬 Текст: ${text.slice(0, 50)}...`
              })
          });
      } catch (e) {
          console.error("Failed to send to Telegram", e);
      }
  };

  const handleCloneAndSpeak = async () => {
      if (!tgUser) {
          alert("Откройте приложение в Telegram для работы.");
          return;
      }
      
      const totalCost = calculateCost();

      if (balance < totalCost) {
          alert(`Недостаточно звезд. Стоимость: ${totalCost} ★`);
          return;
      }
      
      // Validation
      if (activeTab === 'new') {
          if (!file && !recordedBlob) {
              alert("Загрузите файл или запишите голос");
              return;
          }
          if (!voiceName.trim()) {
              alert("Введите название для нового голоса");
              return;
          }
      }

      setIsProcessing(true);
      setResultAudioUrl(null);

      try {
          let currentVoiceId = selectedVoiceId;

          // --- Step 1: Upload File/Blob & Register Voice (If creating new) ---
          if (activeTab === 'new') {
              setStatus('Загрузка образца...');
              const formData = new FormData();
              
              if (file) {
                  formData.append('file', file);
              } else if (recordedBlob) {
                  // Important: Give it a filename with extension
                  formData.append('file', recordedBlob, `recording_${Date.now()}.wav`);
              }
              
              formData.append('purpose', 'voice_clone');

              const uploadRes = await fetch('/minimax-api?path=/v1/files/upload', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}` }, 
                  body: formData
              });

              if (!uploadRes.ok) throw new Error("Ошибка загрузки файла");
              const uploadData = await uploadRes.json();
              if (uploadData.base_resp && uploadData.base_resp.status_code !== 0) throw new Error(uploadData.base_resp.status_msg);
              
              const fileId = uploadData.file?.file_id;
              if (!fileId) throw new Error("File ID не получен");

              // Generate Voice ID
              setStatus('Создание слепка...');
              const newVoiceId = `voice_${tgUser.id}_${Date.now()}`;
              
              // Register Voice via Voice Clone API
              const clonePayload = {
                  file_id: fileId,
                  voice_id: newVoiceId,
                  model: "speech-2.6-hd",
                  text: text // This actually generates audio too
              };

              const cloneRes = await fetch('/minimax-api?path=/v1/voice_clone', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(clonePayload)
              });
              
              const cloneData = await cloneRes.json();
               if (cloneData.base_resp && cloneData.base_resp.status_code !== 0) throw new Error(cloneData.base_resp.status_msg);

              // If clone returns audio directly
              let audioHex = cloneData.data?.audio || cloneData.audio || cloneData.data?.hex;
              
              if (audioHex) {
                  const url = hexToBlobUrl(audioHex);
                  setResultAudioUrl(url);
                  saveVoiceLocally(newVoiceId, voiceName);
                  
                  // Deduct balance
                  const newBal = await userService.deductTokens(tgUser.id, totalCost);
                  if (newBal !== undefined) onUpdateBalance(newBal);

                  // Send to Telegram
                  sendToTelegram(url);

                  setIsProcessing(false);
                  setStatus('');
                  return; 
              }
              
              // If no audio returned immediately, allow fallthrough to T2A
              currentVoiceId = newVoiceId;
              saveVoiceLocally(newVoiceId, voiceName);
          }

          if (!currentVoiceId) {
              throw new Error("Voice ID missing");
          }

          // --- Step 2: Synthesize Speech (T2A) ---
          setStatus('Синтез речи...');
          const t2aPayload = {
              model: "speech-2.6-hd",
              text: text,
              voice_setting: {
                  voice_id: currentVoiceId,
                  speed: 1,
                  vol: 1,
                  pitch: 0
              },
              audio_setting: {
                  sample_rate: 32000,
                  bitrate: 128000,
                  format: "mp3",
                  channel: 1
              }
          };

          const t2aRes = await fetch('/minimax-api?path=/v1/t2a_v2', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(t2aPayload)
          });

          const t2aData = await t2aRes.json();
          if (t2aData.base_resp && t2aData.base_resp.status_code !== 0) throw new Error(t2aData.base_resp.status_msg);
          
          let audioHex = t2aData.data?.audio || t2aData.audio || t2aData.data?.hex;
          if (audioHex) {
              const url = hexToBlobUrl(audioHex);
              setResultAudioUrl(url);
              
              // Deduct balance
              const newBal = await userService.deductTokens(tgUser.id, totalCost);
              if (newBal !== undefined) onUpdateBalance(newBal);

              // Send to Telegram
              sendToTelegram(url);
          } else {
              throw new Error("Аудио не получено");
          }

      } catch (e: any) {
          console.error(e);
          alert("Ошибка: " + e.message);
      } finally {
          setIsProcessing(false);
          setStatus('');
      }
  };

  const price = calculateCost();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">
        
        {/* Header */}
        <div>
           <h1 className="text-3xl md:text-4xl font-bold text-charcoal flex items-center gap-3">
              <span className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Mic2 size={24} />
              </span>
              Клонирование голоса
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Создайте цифровую копию голоса и озвучивайте любой текст.</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
            <button 
                onClick={() => setActiveTab('new')}
                className={clsx(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    activeTab === 'new' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
                )}
            >
                Новый голос
            </button>
            <button 
                onClick={() => setActiveTab('saved')}
                className={clsx(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                    activeTab === 'saved' ? "bg-white text-charcoal shadow-sm" : "text-gray-500 hover:text-charcoal"
                )}
            >
                Сохраненные <span className="bg-gray-200 px-1.5 rounded text-[10px]">{savedVoices.length}</span>
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Input Section */}
            <div className="md:col-span-7 space-y-6">
                
                {activeTab === 'new' && (
                    <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-gray-50 space-y-6">
                        {/* Name Input */}
                        <div>
                             <label className="block text-sm font-bold text-charcoal mb-2 uppercase tracking-wider">
                                1. Название голоса
                             </label>
                             <input 
                                value={voiceName}
                                onChange={(e) => setVoiceName(e.target.value)}
                                placeholder="Например: Мой голос, Диктор 1..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                             />
                        </div>

                        {/* Source Toggle */}
                        <div>
                            <label className="block text-sm font-bold text-charcoal mb-4 uppercase tracking-wider">
                                2. Источник голоса
                            </label>
                            
                            <div className="flex gap-4 mb-4">
                                <button 
                                    onClick={() => setInputType('mic')}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all",
                                        inputType === 'mic' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                                    )}
                                >
                                    <Mic size={18} /> Записать
                                </button>
                                <button 
                                    onClick={() => setInputType('file')}
                                    className={clsx(
                                        "flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all",
                                        inputType === 'file' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100"
                                    )}
                                >
                                    <Upload size={18} /> Загрузить файл
                                </button>
                            </div>

                            {inputType === 'mic' ? (
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-4 bg-gray-50/50">
                                    {!isRecording && !recordedBlob && (
                                        <>
                                            <button 
                                                onClick={startRecording}
                                                className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                                            >
                                                <Mic size={32} />
                                            </button>
                                            <p className="text-sm text-gray-500">Нажмите для записи (мин. 10 сек)</p>
                                        </>
                                    )}
                                    
                                    {isRecording && (
                                        <>
                                            <div className="text-4xl font-mono font-bold text-charcoal animate-pulse">
                                                {formatTime(recordingTime)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                                                 <span className="text-sm text-red-500 font-bold">Идет запись...</span>
                                            </div>
                                            <button 
                                                onClick={stopRecording}
                                                className="px-6 py-2 bg-charcoal text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors mt-2"
                                            >
                                                <Square size={16} fill="currentColor" /> Стоп
                                            </button>
                                        </>
                                    )}

                                    {recordedBlob && (
                                        <div className="w-full">
                                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 mb-3 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                                                        <Volume2 size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-sm">Запись микрофона</div>
                                                        <div className="text-xs text-gray-400">{(recordedBlob.size / 1024).toFixed(1)} KB</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => setRecordedBlob(null)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                                            </div>
                                            <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all group"
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                        accept=".mp3,.wav,.m4a"
                                    />
                                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <Upload size={24} />
                                    </div>
                                    {file ? (
                                        <div>
                                            <div className="font-bold text-charcoal">{file.name}</div>
                                            <div className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="font-bold text-charcoal">Нажмите для загрузки</div>
                                            <div className="text-xs text-gray-400 mt-1">MP3, WAV, M4A (10с - 5мин)</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-gray-50">
                         <label className="block text-sm font-bold text-charcoal mb-4 uppercase tracking-wider flex items-center gap-2">
                             <Volume2 size={16} /> Выберите голос
                        </label>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {savedVoices.length === 0 ? (
                                <div className="text-center text-gray-400 py-4 text-sm">Нет сохраненных голосов</div>
                            ) : (
                                savedVoices.map(v => (
                                    <div 
                                        key={v.id} 
                                        onClick={() => setSelectedVoiceId(v.id)}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border",
                                            selectedVoiceId === v.id ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-transparent hover:bg-gray-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-charcoal shadow-sm font-bold text-xs">
                                                {v.name[0].toUpperCase()}
                                            </div>
                                            <div className="text-sm font-bold text-charcoal truncate max-w-[150px]">{v.name}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteVoice(v.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-gray-50">
                    <label className="block text-sm font-bold text-charcoal mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles size={16} /> {activeTab === 'new' ? '3.' : '2.'} Текст для озвучки
                    </label>
                    <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                        placeholder="Введите текст, который нужно озвучить..."
                    />
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>{text.length} знаков</span>
                        <div className="flex items-center gap-2">
                             <span className={text.length > 1000 ? "text-orange-500 font-bold" : "text-gray-400"}>
                                 {text.length > 1000 ? `+${Math.ceil((text.length - 1000)/1000) * TTS_EXTRA_COST} ★ за объем` : 'Базовая цена'}
                             </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleCloneAndSpeak}
                    disabled={isProcessing || (activeTab === 'new' && (!voiceName || (!file && !recordedBlob))) || (activeTab === 'saved' && !selectedVoiceId) || !text}
                    className="w-full py-4 bg-charcoal text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                    {isProcessing ? status : `Сгенерировать (${price} ★)`}
                </button>
                
                <div className="text-center text-xs text-gray-400">
                    Клон голоса: {CLONE_COST} ★ (только новые) | Озвучка: от {TTS_BASE_COST} ★
                </div>
            </div>

            {/* Result Section */}
            <div className="md:col-span-5">
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-soft border border-gray-50 h-full min-h-[300px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                     {resultAudioUrl ? (
                         <div className="animate-fadeIn w-full">
                             <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                                 <CheckCircle2 size={40} />
                             </div>
                             <h3 className="text-xl font-bold text-charcoal mb-2">Готово!</h3>
                             <p className="text-gray-500 text-sm mb-6">Аудио отправлено вам в Telegram.</p>
                             
                             <audio controls src={resultAudioUrl} className="w-full mb-6" />
                             
                             <a 
                                href={resultAudioUrl} 
                                download={`cloned-voice-${Date.now()}.mp3`}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-charcoal font-bold rounded-xl transition-colors"
                             >
                                 <Download size={18} /> Скачать
                             </a>
                         </div>
                     ) : (
                         <div className="text-gray-300">
                             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                 <Volume2 size={40} className="opacity-20" />
                             </div>
                             <p className="font-bold text-lg">Результат будет здесь</p>
                             <p className="text-sm mt-2 opacity-60 max-w-[200px] mx-auto">Загрузите образец и введите текст, чтобы услышать магию.</p>
                         </div>
                     )}

                     {isProcessing && (
                         <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 flex-col gap-4">
                             <Loader2 className="animate-spin text-blue-600" size={48} />
                             <p className="font-bold text-charcoal animate-pulse">{status}</p>
                         </div>
                     )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

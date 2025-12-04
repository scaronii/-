import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Globe, Bot, User, X, FileText, Image as ImageIcon, ChevronDown, Mic, Copy, Check, AlertTriangle } from 'lucide-react';
import { Message } from '../types';
import { TEXT_MODELS } from '../constants';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, modelId: string, attachment: { mimeType: string; data: string } | null, useSearch: boolean) => void;
  isTyping: boolean;
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isTyping,
  selectedModelId,
  onSelectModel
}) => {
  const [input, setInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Voice Input Logic
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // Logic would go here to stop recognition if managed manually
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Ваш браузер не поддерживает голосовой ввод.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isTyping) return;
    
    const text = input;
    const currentAttachment = attachment ? { mimeType: attachment.mimeType, data: attachment.data } : null;
    
    setInput('');
    setAttachment(null);
    onSendMessage(text, selectedModelId, currentAttachment, isSearchEnabled);
  };

  const selectedModel = TEXT_MODELS.find(m => m.id === selectedModelId) || TEXT_MODELS[0];

  // Custom Code Block Component with Copy
  const CodeBlock = ({ children, className }: any) => {
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, '');
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="rounded-xl overflow-hidden my-4 border border-gray-800 shadow-md">
        <div className="bg-charcoal px-4 py-2 flex items-center justify-center sm:justify-between text-xs text-gray-300">
          <span className="font-mono uppercase">{language}</span>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {copied ? <Check size={14} className="text-lime" /> : <Copy size={14} />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
        <div className="bg-[#1e1e1e] p-4 overflow-x-auto">
          <code className={className} style={{ fontFamily: 'monospace' }}>
            {children}
          </code>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header / Model Selector */}
      <div className="h-20 flex items-center justify-between px-6 lg:px-10 z-10">
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 text-base font-bold text-charcoal bg-surface hover:bg-white px-5 py-3 rounded-full shadow-soft transition-all active:scale-95 border border-gray-50"
          >
            <span className={clsx(
              "w-2.5 h-2.5 rounded-full",
              selectedModel.provider === 'OpenAI' ? 'bg-green-500' :
              selectedModel.provider === 'Google' ? 'bg-blue-500' :
              'bg-purple-500'
            )}></span>
            {selectedModel.name}
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-3 w-72 bg-surface rounded-[2rem] shadow-xl p-2 z-20 border border-gray-100 animation-fadeIn">
               <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Доступные модели</div>
               <div className="max-h-[300px] overflow-y-auto">
                {TEXT_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setDropdownOpen(false);
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-3 rounded-2xl text-sm flex items-center justify-between transition-colors",
                      selectedModelId === model.id 
                        ? "bg-charcoal text-white" 
                        : "text-charcoal hover:bg-gray-50"
                    )}
                  >
                    <span className="font-medium">{model.name}</span>
                    {model.isNew && <span className="text-[10px] bg-lime text-charcoal font-bold px-1.5 py-0.5 rounded">NEW</span>}
                  </button>
                ))}
               </div>
            </div>
          )}
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-green-700 text-xs font-bold uppercase tracking-wide">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Без VPN
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-4xl mx-auto space-y-8 py-4">
          {messages.length === 0 ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-fadeIn">
              <div className="w-20 h-20 bg-lime text-charcoal rounded-3xl flex items-center justify-center mb-8 shadow-glow transform -rotate-3">
                <Bot size={40} strokeWidth={1.5} />
              </div>
              <h1 className="text-4xl font-bold text-charcoal mb-4 tracking-tight">Привет, я UniAI</h1>
              <p className="text-gray-500 max-w-lg mb-12 text-lg leading-relaxed">
                Доступ к GPT-5, Gemini, DeepSeek и другим нейросетям в одном месте. Чем могу помочь сегодня?
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl px-4">
                {[
                  { title: 'Написать код', desc: 'Python скрипт для парсинга', icon: <FileText size={20} className="text-blue-500" /> },
                  { title: 'Анализ фото', desc: 'Что изображено на картинке?', icon: <ImageIcon size={20} className="text-purple-500" /> },
                  { title: 'Поиск данных', desc: 'Курс биткоина сегодня', icon: <Globe size={20} className="text-green-500" /> }
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => onSendMessage(item.desc, selectedModelId, null, false)}
                    className="bg-surface p-5 rounded-[2rem] shadow-sm border border-transparent hover:border-lime hover:shadow-soft text-left transition-all group"
                  >
                    <div className="mb-3 p-2 bg-gray-50 rounded-xl w-fit group-hover:bg-white transition-colors">{item.icon}</div>
                    <h3 className="font-bold text-charcoal mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              // Hide empty model messages (placeholders for streaming)
              // We check for null/empty and strip all whitespace to prevent ghost bubbles
              if (msg.role === 'model' && (!msg.text || !msg.text.replace(/\s/g, '')) && !msg.isError) return null;

              return (
                <div 
                  key={msg.id} 
                  className={clsx(
                    "flex gap-4",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div className={clsx(
                    "w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm",
                    msg.role === 'user' ? "bg-charcoal text-white" : "bg-white text-charcoal border border-gray-100",
                    msg.isError && "bg-red-50 border-red-100 text-red-500"
                  )}>
                    {msg.isError ? <AlertTriangle size={18} /> : (msg.role === 'user' ? <User size={18} /> : <Bot size={18} />)}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={clsx(
                    "rounded-[2rem] px-8 py-6 max-w-[85%] sm:max-w-[75%] shadow-sm text-base leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-lime text-charcoal rounded-tr-none" 
                      : "bg-white text-charcoal border border-gray-50 rounded-tl-none shadow-soft",
                    msg.isError && "bg-red-50 text-red-800 border-red-100"
                  )}>
                    {msg.role === 'model' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="markdown-body"
                        components={{
                          code: ({node, className, children, ...props}: any) => {
                             const match = /language-(\w+)/.exec(className || '')
                             return match ? (
                               <CodeBlock className={className}>{children}</CodeBlock>
                             ) : (
                               <code className={className} {...props}>
                                 {children}
                               </code>
                             )
                          },
                          a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline" />
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-gray-100 flex-shrink-0 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-white border border-gray-50 rounded-[2rem] rounded-tl-none px-6 py-4 flex items-center gap-2 shadow-soft">
                <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-charcoal rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit} 
            className="relative bg-surface p-2 rounded-[2.5rem] shadow-soft border border-gray-100 flex items-end gap-2"
          >
            {/* Attachment Preview */}
            {attachment && (
              <div className="absolute bottom-full left-0 mb-3 bg-surface rounded-2xl p-3 flex items-center gap-3 shadow-lg border border-gray-100 animate-fadeIn">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                  {attachment.mimeType.startsWith('image') ? (
                    <ImageIcon size={20} className="text-purple-500" />
                  ) : (
                    <FileText size={20} className="text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 max-w-[150px]">
                  <div className="text-sm font-bold truncate text-charcoal">{attachment.name}</div>
                  <div className="text-[10px] text-gray-500 uppercase">{attachment.mimeType.split('/')[1]}</div>
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

            {/* Left Buttons */}
            <div className="flex pb-2 pl-2 gap-2">
               <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf"
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-105",
                  attachment ? "bg-blue-100 text-blue-600" : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-charcoal"
                )}
                title="Прикрепить файл"
              >
                <Paperclip size={20} />
              </button>

               <button 
                type="button" 
                onClick={toggleListening}
                className={clsx(
                  "w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-105",
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-charcoal"
                )}
                title="Голосовой ввод"
              >
                <Mic size={20} />
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Спроси о чем угодно..."
              className="flex-1 bg-transparent text-charcoal placeholder-gray-400 py-5 px-4 max-h-32 min-h-[64px] resize-none focus:outline-none text-base"
              rows={1}
            />
            
            {/* Right Buttons */}
            <div className="flex items-center gap-2 pb-2 pr-2">
               <button 
                type="button" 
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                className={clsx(
                  "w-12 h-12 flex items-center justify-center rounded-full transition-all hover:scale-105",
                  isSearchEnabled ? "bg-lime text-charcoal border border-lime shadow-glow" : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-charcoal"
                )}
                title="Поиск в интернете"
              >
                <Globe size={20} />
              </button>
              
              <button 
                type="submit" 
                disabled={(!input.trim() && !attachment) || isTyping}
                className="w-14 h-14 bg-charcoal text-white rounded-full flex items-center justify-center hover:bg-black hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shadow-lg shadow-charcoal/20"
              >
                <Send size={24} className={input.trim() ? "ml-1" : ""} />
              </button>
            </div>
          </form>
          <div className="text-center mt-3 text-xs font-medium text-gray-400 flex items-center justify-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-lime"></span> UniAI работает на базе официальных API
          </div>
        </div>
      </div>
    </div>
  );
};
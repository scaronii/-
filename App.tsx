import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { ImageGenerator } from './components/ImageGenerator';
import { Pricing } from './components/Pricing';
import { SettingsModal } from './components/SettingsModal';
import { ChatSession, Message, ViewState } from './types';
import { streamChatResponse } from './services/geminiService';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5-nano'); // Default per prompt
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Settings State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState('');

  // Initialize a chat if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      handleNewChat();
    }
  }, []);

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [],
      updatedAt: Date.now(),
      modelId: selectedModelId,
      systemInstruction: systemInstruction // Persist current instruction
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setCurrentView('chat');
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const handleSendMessage = async (text: string, modelId: string, attachment: { mimeType: string; data: string } | null, useSearch: boolean) => {
    if (!currentSessionId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: attachment ? `[Файл: ${attachment.mimeType}] ${text}` : text,
      timestamp: Date.now(),
    };

    // Update UI immediately with user message
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          title: s.messages.length === 0 ? text.slice(0, 30) : s.title 
        };
      }
      return s;
    }));

    setIsTyping(true);

    // Create placeholder for AI message
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
    };

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: [...s.messages, aiMsg] };
      }
      return s;
    }));

    try {
      // Safely construct history, ensuring text is never undefined
      const history = currentSession.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text || " " }] 
      }));

      let accumulatedText = "";

      await streamChatResponse({
        modelId,
        history,
        message: text,
        attachment,
        useSearch,
        systemInstruction: currentSession.systemInstruction || systemInstruction,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const updatedMessages = s.messages.map(m => 
                m.id === aiMsgId ? { ...m, text: accumulatedText } : m
              );
              return { ...s, messages: updatedMessages };
            }
            return s;
          }));
        }
      });

    } catch (error: any) {
      console.error("Error sending message", error);
      // UPDATE UI WITH ERROR
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMessages = s.messages.map(m => 
            m.id === aiMsgId ? { 
              ...m, 
              text: `⚠️ Ошибка: ${error.message || 'Не удалось получить ответ'}`,
              isError: true 
            } : m
          );
          return { ...s, messages: updatedMessages };
        }
        return s;
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        return (
          <ChatInterface 
            messages={currentSession?.messages || []}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
          />
        );
      case 'images':
        return <ImageGenerator />;
      case 'pricing':
        return <Pricing />;
      case 'docs':
        return (
          <div className="p-6 lg:p-12 overflow-y-auto h-full">
            <div className="max-w-5xl mx-auto space-y-10 pb-12">
              <div className="bg-charcoal text-white rounded-[2.5rem] p-10 text-center shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-lime/20 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-lime/30 transition-colors duration-500"></div>
                <h1 className="text-4xl font-bold mb-4 relative z-10">База знаний UniAI</h1>
                <p className="text-gray-300 text-lg relative z-10">Профессиональные гайды и инструкции. Учитесь бесплатно.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card 1: Start (Blue) */}
                <div className="bg-surface p-8 rounded-[2rem] shadow-soft border border-gray-50 hover:shadow-lg transition-all hover:-translate-y-1 group">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    {/* Custom Abstract Compass Icon */}
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="12" className="stroke-blue-200" strokeWidth="2"/>
                      <circle cx="16" cy="16" r="4" className="fill-blue-500"/>
                      <path d="M16 4L16 8" className="stroke-blue-500" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M28 16L24 16" className="stroke-blue-300" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16 28L16 24" className="stroke-blue-300" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4 16L8 16" className="stroke-blue-300" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M20 12L12 20" className="stroke-blue-500" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-charcoal mb-4">Начало работы</h3>
                  <ul className="space-y-3 text-gray-600 font-medium">
                    <li>• Выберите модель в чате (GPT-5 для текстов)</li>
                    <li>• Используйте скрепку для загрузки файлов</li>
                    <li>• Глобус включает поиск в интернете</li>
                  </ul>
                </div>

                {/* Card 2: Economy (Yellow) */}
                <div className="bg-surface p-8 rounded-[2rem] shadow-soft border border-gray-50 hover:shadow-lg transition-all hover:-translate-y-1 group">
                  <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    {/* Custom Abstract Stack Icon */}
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="8" y="20" width="16" height="4" rx="2" className="fill-yellow-400"/>
                      <rect x="8" y="14" width="16" height="4" rx="2" className="fill-yellow-300"/>
                      <rect x="8" y="8" width="16" height="4" rx="2" className="fill-yellow-200"/>
                      <path d="M22 26H10C8.89543 26 8 25.1046 8 24V10C8 8.89543 8.89543 8 10 8H22C23.1046 8 24 8.89543 24 10V24C24 25.1046 23.1046 26 22 26Z" className="stroke-yellow-600" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-charcoal mb-4">Экономика</h3>
                  <ul className="space-y-3 text-gray-600 font-medium">
                    <li>• 1 токен ≈ 0.75 слова</li>
                    <li>• Картинки: ~5,000 токенов</li>
                    <li>• Тарифы от 250₽ в месяц</li>
                  </ul>
                </div>

                {/* Card 3: Generation (Purple) */}
                <div className="bg-surface p-8 rounded-[2rem] shadow-soft border border-gray-50 hover:shadow-lg transition-all hover:-translate-y-1 group">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    {/* Custom Abstract Canvas Icon */}
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="6" width="20" height="20" rx="4" className="fill-purple-100"/>
                      <circle cx="12" cy="12" r="2" className="fill-purple-300"/>
                      <path d="M26 20L21 15C20.6095 14.6095 19.9763 14.6095 19.5858 15L15 19.5858" className="stroke-purple-400" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M6 22L10 18C10.3905 17.6095 11.0237 17.6095 11.4142 18L17 23.5858" className="stroke-purple-500" strokeWidth="2" strokeLinecap="round"/>
                      <rect x="6" y="6" width="20" height="20" rx="4" className="stroke-purple-600" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-charcoal mb-4">Генерация</h3>
                  <p className="text-gray-500 mb-4 font-medium">Формула идеального промпта:</p>
                  <code className="block bg-gray-100 p-4 rounded-xl text-sm text-charcoal font-mono border border-gray-200">
                    [Объект] + [Окружение] + [Стиль]
                  </code>
                </div>

                {/* Card 4: Models (Green) */}
                <div className="bg-surface p-8 rounded-[2rem] shadow-soft border border-gray-50 hover:shadow-lg transition-all hover:-translate-y-1 group">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    {/* Custom Abstract Network Icon */}
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="8" r="3" className="fill-green-400"/>
                      <circle cx="8" cy="24" r="3" className="fill-green-400"/>
                      <circle cx="24" cy="24" r="3" className="fill-green-400"/>
                      <path d="M16 8L8 24" className="stroke-green-600" strokeWidth="2"/>
                      <path d="M16 8L24 24" className="stroke-green-600" strokeWidth="2"/>
                      <path d="M8 24H24" className="stroke-green-200" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-charcoal mb-4">Модели</h3>
                  <ul className="space-y-3 text-gray-600 font-medium">
                    <li><strong className="text-charcoal">Gemini 3.0:</strong> Аналитика</li>
                    <li><strong className="text-charcoal">GPT-5:</strong> Логика</li>
                    <li><strong className="text-charcoal">Claude:</strong> Кодинг</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-offwhite text-charcoal overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={currentView}
        onNavigate={setCurrentView}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        toggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 h-full relative flex flex-col min-w-0 md:p-4">
        {/* Mobile Header Trigger */}
        <div className="md:hidden absolute top-4 left-4 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-surface rounded-xl shadow-md text-charcoal border border-gray-100">
            <Menu size={24} />
          </button>
        </div>
        
        <div className="h-full bg-transparent md:bg-white md:rounded-[2.5rem] md:shadow-soft md:border md:border-gray-50 overflow-hidden relative">
          {renderContent()}
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        systemInstruction={systemInstruction}
        onSave={setSystemInstruction}
      />
    </div>
  );
};

export default App;
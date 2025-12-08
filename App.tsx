
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { Pricing } from './components/Pricing';
import { SettingsModal } from './components/SettingsModal';
import { Profile } from './components/Profile';
import { ChatSession, Message, ViewState, TelegramUser } from './types';
import { streamChatResponse } from './services/geminiService';
import { userService } from './services/userService';
import { Menu } from 'lucide-react';
import { TEXT_MODELS } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('gpt-5-nano'); 
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState('');
  
  const [tgUser, setTgUser] = useState<TelegramUser | null>(null);
  const [balance, setBalance] = useState<number>(0); 
  const [messageCount, setMessageCount] = useState<number>(0);
  const [imageCount, setImageCount] = useState<number>(0);
  const [videoCount, setVideoCount] = useState<number>(0);

  useEffect(() => {
    const initApp = async () => {
      let user = null;
      if ((window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe?.user) {
          user = tg.initDataUnsafe.user;
          setTgUser(user);
        }
      }

      if (user) {
        await userService.initUser(user);
        const bal = await userService.getBalance(user.id);
        setBalance(bal);
        
        const msgCount = await userService.getUserMessageCount(user.id);
        setMessageCount(msgCount);
        
        const imgCount = await userService.getUserImageCount(user.id);
        setImageCount(imgCount);

        const vidCount = await userService.getUserVideoCount(user.id);
        setVideoCount(vidCount);

        const history = await userService.getUserChats(user.id);
        if (history.length > 0) {
          setSessions(history);
          setCurrentSessionId(history[0].id);
        } else {
          await createNewChatSession(user.id);
        }
      } else {
        handleNewChat();
      }
    };

    initApp();
  }, []);

  const createNewChatSession = async (userId?: number) => {
    let newId = Date.now().toString();
    if (userId) {
       const dbId = await userService.createChat(userId, 'Новый чат', selectedModelId);
       if (dbId) newId = dbId;
    }
    const newSession: ChatSession = {
      id: newId,
      title: 'Новый чат',
      messages: [],
      updatedAt: Date.now(),
      modelId: selectedModelId,
      systemInstruction: systemInstruction
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    return newId;
  };

  const handleNewChat = () => {
    if (tgUser) {
      createNewChatSession(tgUser.id);
    } else {
      createNewChatSession();
    }
    setCurrentView('chat');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteChat = async (sessionId: string) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот чат?")) return;

    const prevSessions = [...sessions];
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);

    if (currentSessionId === sessionId) {
       if (newSessions.length > 0) {
           setCurrentSessionId(newSessions[0].id);
       } else {
           handleNewChat();
       }
    }

    if (tgUser) {
        const success = await userService.deleteChat(sessionId);
        if (!success) {
            // Optional: revert logic could go here, but simple alert is often enough
            console.error("Failed to delete chat from DB");
        }
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const handleSendMessage = async (text: string, modelId: string, attachment: { mimeType: string; data: string } | null, useSearch: boolean) => {
    if (!currentSessionId) return;

    const model = TEXT_MODELS.find(m => m.id === modelId);
    const cost = model?.cost || 1;
    
    const isFree = messageCount < 10 && cost === 1;

    if (!isFree && balance < cost) {
      alert(`Недостаточно звезд. Стоимость запроса: ${cost} ★. Ваш баланс: ${balance} ★.`);
      setCurrentView('pricing');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: attachment ? `[Файл: ${attachment.mimeType}] ${text}` : text,
      timestamp: Date.now(),
    };

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
    
    if (tgUser) {
       userService.saveMessage(currentSessionId, 'user', userMsg.text);
       setMessageCount(prev => prev + 1);
    }

    setIsTyping(true);

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

      if (tgUser) {
        await userService.saveMessage(currentSessionId, 'model', accumulatedText);
        if (!isFree) {
            const newBalance = await userService.deductTokens(tgUser.id, cost);
            if (newBalance !== undefined) setBalance(newBalance);
        }
      } 

    } catch (error: any) {
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
        return (
          <ImageGenerator 
             balance={balance} 
             onUpdateBalance={setBalance} 
             tgUser={tgUser} 
             onImageGenerated={() => setImageCount(prev => prev + 1)}
          />
        );
      case 'video':
        return (
          <VideoGenerator
             balance={balance}
             onUpdateBalance={setBalance}
             tgUser={tgUser}
             onVideoGenerated={() => setVideoCount(prev => prev + 1)}
          />
        );
      case 'pricing':
        return <Pricing tgUser={tgUser} />;
      case 'profile':
        return (
          <Profile 
            user={tgUser}
            balance={balance}
            messageCount={messageCount}
            imageCount={imageCount}
            videoCount={videoCount}
            sessionsCount={sessions.length}
            systemInstruction={systemInstruction}
            onSaveSystemInstruction={setSystemInstruction}
            onNavigateToPricing={() => setCurrentView('pricing')}
          />
        );
      case 'docs':
        return (
          <div className="p-4 md:p-6 lg:p-12 overflow-y-auto h-full pt-16 md:pt-6">
            <div className="max-w-5xl mx-auto space-y-10 pb-12">
              <div className="bg-charcoal text-white rounded-[2.5rem] p-6 md:p-10 text-center shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-lime/20 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-lime/30 transition-colors duration-500"></div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">База знаний UniAI</h1>
                <p className="text-gray-300 text-base md:text-lg relative z-10">Профессиональные гайды и инструкции. Учитесь бесплатно.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-surface p-6 md:p-8 rounded-[2rem] shadow-soft border border-gray-50">
                    <h3 className="text-xl md:text-2xl font-bold text-charcoal mb-4">Начало работы</h3>
                    <p className="text-gray-600">Инструкция по использованию нейросетей...</p>
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
    <div className="flex h-[100dvh] w-screen bg-offwhite text-charcoal overflow-hidden font-sans">
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
        onDeleteChat={handleDeleteChat}
      />
      <main className="flex-1 h-full relative flex flex-col min-w-0 md:p-4">
        <div className="md:hidden absolute top-3 left-3 z-20 flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)} className="p-2.5 bg-surface rounded-xl shadow-md text-charcoal border border-gray-100 active:scale-95 transition-transform">
            <Menu size={22} />
          </button>
          {tgUser && (
             <div 
               className="bg-surface px-3 py-2.5 rounded-xl shadow-md border border-gray-100 text-xs font-bold text-charcoal flex items-center gap-1.5 active:scale-95 transition-transform"
               onClick={() => setCurrentView('profile')}
             >
               <span className="w-2 h-2 bg-lime rounded-full animate-pulse"></span>
               {balance.toLocaleString()} ★
             </div>
          )}
        </div>
        <div className="hidden md:block absolute top-6 right-8 z-20">
             <div 
               className="bg-white px-4 py-2 rounded-xl shadow-soft border border-gray-50 text-sm font-bold text-charcoal flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform" 
               onClick={() => setCurrentView('profile')}
             >
               <span>Баланс:</span>
               <span className="text-lime-700">{balance.toLocaleString()} ★</span>
               {messageCount < 10 && <span className="text-[10px] bg-lime px-2 py-0.5 rounded-full">FREE {10 - messageCount}</span>}
             </div>
        </div>
        <div className="h-full bg-transparent md:bg-white md:rounded-[2.5rem] md:shadow-soft md:border md:border-gray-50 overflow-hidden relative">
          {renderContent()}
        </div>
      </main>
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

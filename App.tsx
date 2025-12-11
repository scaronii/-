
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { MusicGenerator } from './components/MusicGenerator';
import { Pricing } from './components/Pricing';
import { SettingsModal } from './components/SettingsModal';
import { Profile } from './components/Profile';
import { Gallery } from './components/Gallery';
import { Dashboard } from './components/Dashboard';
import { ChatSession, Message, ViewState, TelegramUser } from './types';
import { streamChatResponse } from './services/geminiService';
import { userService } from './services/userService';
import { Menu, Zap } from 'lucide-react';
import { TEXT_MODELS } from './constants';
import { clsx } from 'clsx';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
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
  const [musicCount, setMusicCount] = useState<number>(0);

  useEffect(() => {
    const initApp = async () => {
      let user = null;
      if ((window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
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

        const musCount = await userService.getUserMusicCount(user.id);
        setMusicCount(musCount);

        const history = await userService.getUserChats(user.id);
        if (history.length > 0) {
          setSessions(history);
          setCurrentSessionId(history[0].id);
        } else {
          const newId = await createNewChatSession(user.id, false);
          setCurrentSessionId(newId);
        }
      } else {
         const newId = await createNewChatSession(undefined, false);
         setCurrentSessionId(newId);
      }
    };

    initApp();
  }, []);

  const createNewChatSession = async (userId?: number, switchToChat: boolean = true) => {
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
    if (switchToChat) {
      setCurrentSessionId(newId);
      setCurrentView('chat');
    }
    return newId;
  };

  const handleNewChat = () => {
    if (tgUser) {
      createNewChatSession(tgUser.id, true);
    } else {
      createNewChatSession(undefined, true);
    }
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
            console.error("Failed to delete chat from DB");
        }
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const handleSendMessage = async (text: string, modelId: string, attachment: { mimeType: string; data: string; name?: string } | null, useSearch: boolean) => {
    if (!currentSessionId) return;

    const model = TEXT_MODELS.find(m => m.id === modelId);
    const cost = model?.cost || 1;
    const isFree = messageCount < 10 && cost === 1;

    if (!isFree && balance < cost) {
      alert(`Недостаточно звезд. Стоимость: ${cost} ★. Ваш баланс: ${balance} ★.`);
      setCurrentView('pricing');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: attachment ? `[Файл: ${attachment.mimeType}] ${text}` : text,
      timestamp: Date.now(),
    };

    // Calculate intelligent chat title based on first message context
    let newChatTitle = text.slice(0, 40).replace(/[\r\n]+/g, ' ').trim();
    if (text.length > 40) newChatTitle += '...';
    if (!newChatTitle && attachment) newChatTitle = `Файл: ${attachment.name || 'Unknown'}`;
    if (!newChatTitle) newChatTitle = "Новый чат";

    const isFirstMessage = currentSession.messages.length === 0;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          title: isFirstMessage ? newChatTitle : s.title 
        };
      }
      return s;
    }));
    
    if (tgUser) {
       userService.saveMessage(currentSessionId, 'user', userMsg.text);
       if (isFirstMessage) {
           userService.updateChatTitle(currentSessionId, newChatTitle);
       }
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
      case 'dashboard': return <Dashboard user={tgUser} onNavigate={setCurrentView} balance={balance} />;
      case 'chat': return <ChatInterface messages={currentSession?.messages || []} onSendMessage={handleSendMessage} isTyping={isTyping} selectedModelId={selectedModelId} onSelectModel={setSelectedModelId} />;
      case 'images': return <ImageGenerator balance={balance} onUpdateBalance={setBalance} tgUser={tgUser} onImageGenerated={() => setImageCount(prev => prev + 1)} />;
      case 'video': return <VideoGenerator balance={balance} onUpdateBalance={setBalance} tgUser={tgUser} onVideoGenerated={() => setVideoCount(prev => prev + 1)} />;
      case 'music': return <MusicGenerator balance={balance} onUpdateBalance={setBalance} tgUser={tgUser} />;
      case 'pricing': return <Pricing tgUser={tgUser} />;
      case 'gallery': 
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-10 space-y-6">
                <h1 className="text-3xl md:text-4xl font-bold text-charcoal tracking-tight">Мой контент</h1>
                <Gallery user={tgUser} />
            </div>
          </div>
        );
      case 'profile': return <Profile user={tgUser} balance={balance} messageCount={messageCount} imageCount={imageCount} videoCount={videoCount} musicCount={musicCount} sessionsCount={sessions.length} systemInstruction={systemInstruction} onSaveSystemInstruction={setSystemInstruction} onNavigateToPricing={() => setCurrentView('pricing')} />;
      case 'docs':
        return (
          <div className="p-4 md:p-6 lg:p-12 overflow-y-auto h-full">
            <div className="max-w-5xl mx-auto space-y-10 pb-12">
              <div className="bg-charcoal text-white rounded-[2.5rem] p-6 md:p-10 text-center shadow-xl relative overflow-hidden group">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">База знаний UniAI</h1>
                <p className="text-gray-300 text-base md:text-lg relative z-10">Профессиональные гайды и инструкции.</p>
              </div>
            </div>
          </div>
        );
      default: return null;
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
        
        {/* Mobile App Bar (Header) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white z-40 flex items-center justify-between px-4 shadow-sm border-b border-gray-100">
           <button 
             onClick={() => setSidebarOpen(true)}
             className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-charcoal active:scale-95 transition-all"
           >
             <Menu size={24} strokeWidth={2.5} />
           </button>

           <div className="font-bold text-lg text-charcoal flex items-center gap-2">
             <div className="w-8 h-8 bg-charcoal text-lime rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </div>
             UniAI
           </div>
           
           <div 
             className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-bold text-charcoal active:scale-95 transition-transform"
             onClick={() => setCurrentView('pricing')}
           >
              <Zap size={14} className="text-lime-600 fill-lime-600" />
              {balance.toLocaleString()}
           </div>
        </div>

        {/* Desktop Balance Badge - Hidden on Dashboard to avoid duplication */}
        {currentView !== 'dashboard' && (
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
        )}

        {/* Main Content Area - Global padding handled here */}
        <div className="h-full bg-transparent md:bg-white md:rounded-[2.5rem] md:shadow-soft md:border md:border-gray-50 overflow-hidden relative flex flex-col pt-16 md:pt-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             {renderContent()}
          </div>
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
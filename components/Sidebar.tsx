
import React from 'react';
import { MessageSquare, ImageIcon, CreditCard, BookOpen, Settings, Plus, Menu, LogOut, ChevronRight, Video, Trash2 } from 'lucide-react';
import { ChatSession, ViewState } from '../types';
import { clsx } from 'clsx';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  toggleOpen: () => void;
  onOpenSettings: () => void;
  onDeleteChat: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  isOpen,
  toggleOpen,
  onOpenSettings,
  onDeleteChat
}) => {
  const navItems = [
    { id: 'chat', label: 'Чат', icon: MessageSquare },
    { id: 'images', label: 'Генерация', icon: ImageIcon },
    { id: 'video', label: 'Видео', icon: Video, badge: 'Sora' },
    { id: 'pricing', label: 'Магазин', icon: CreditCard },
    { id: 'docs', label: 'Инструкции', icon: BookOpen },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={clsx(
          "fixed inset-0 bg-charcoal/20 backdrop-blur-sm z-40 md:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggleOpen}
      />

      <aside className={clsx(
        "fixed md:static inset-y-4 left-4 z-50 w-72 bg-surface rounded-3xl shadow-soft flex flex-col transition-transform duration-300 transform border border-gray-100/50 md:ml-4 md:my-4",
        isOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"
      )}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl text-charcoal">
            <div className="w-10 h-10 bg-charcoal text-lime rounded-xl flex items-center justify-center shadow-lg shadow-charcoal/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span>UniAI</span>
          </div>
          <button onClick={toggleOpen} className="md:hidden text-gray-400 hover:text-charcoal transition-colors">
            <Menu size={24} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-6 mb-6">
          <button
            onClick={() => {
              onNavigate('chat');
              onNewChat();
              if (window.innerWidth < 768) toggleOpen();
            }}
            className="w-full bg-charcoal hover:bg-black text-white py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-charcoal/20 hover:scale-[1.02] active:scale-95"
          >
            <Plus size={20} />
            <span className="font-medium">Новый чат</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id as ViewState);
                if (window.innerWidth < 768) toggleOpen();
              }}
              className={clsx(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                currentView === item.id 
                  ? "bg-lime text-charcoal shadow-glow" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-charcoal"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} />
                {item.label}
              </div>
              {item.badge && (
                <span className={clsx(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  currentView === item.id 
                    ? "bg-charcoal text-white" 
                    : "bg-lime/30 text-charcoal"
                )}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Recent History */}
        <div className="mt-6 px-6 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">
            История
          </h3>
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="text-sm text-gray-400 italic px-2">Нет истории</div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="relative group">
                  <button
                    onClick={() => {
                      onNavigate('chat');
                      onSelectSession(session.id);
                      if (window.innerWidth < 768) toggleOpen();
                    }}
                    className={clsx(
                      "w-full text-left px-4 py-2.5 rounded-xl text-sm truncate transition-colors pr-9",
                      currentSessionId === session.id
                        ? "bg-gray-100 text-charcoal font-medium"
                        : "text-gray-500 hover:bg-gray-50 hover:text-charcoal"
                    )}
                  >
                    {session.title || "Новый чат"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(session.id);
                    }}
                    className={clsx(
                      "absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all",
                      currentSessionId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    title="Удалить чат"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 mt-2">
          <div 
            className={clsx(
               "bg-gray-50 rounded-2xl p-3 flex items-center gap-3 border border-gray-100 cursor-pointer hover:border-gray-200 transition-all active:scale-[0.98]",
               currentView === 'profile' && "bg-gray-100 border-gray-200"
            )}
            onClick={() => {
              onNavigate('profile');
              if (window.innerWidth < 768) toggleOpen();
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime to-green-300 flex items-center justify-center text-charcoal font-bold text-sm shadow-sm">
              <Settings size={20} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-charcoal truncate">Личный кабинет</p>
              <p className="text-xs text-gray-500 truncate">Профиль и настройки</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </div>
        </div>
      </aside>
    </>
  );
};

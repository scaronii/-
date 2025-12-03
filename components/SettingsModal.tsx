import React, { useState } from 'react';
import { X, Save, Sparkles, UserCog } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInstruction: string;
  onSave: (instruction: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, systemInstruction, onSave }) => {
  const [instruction, setInstruction] = useState(systemInstruction);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      <div className="relative bg-surface w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 animate-fadeIn">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-charcoal flex items-center gap-3">
            <div className="w-10 h-10 bg-lime/20 text-lime-700 rounded-2xl flex items-center justify-center">
              <UserCog size={22} />
            </div>
            Настройки AI
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-charcoal mb-3 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-lime-600" />
              Системная инструкция (Persona)
            </label>
            <p className="text-gray-500 text-sm mb-3">
              Задайте роль или правила поведения для нейросети. Это будет применено ко всем новым сообщениям.
            </p>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Например: Ты опытный Python разработчик. Отвечай кратко и по делу. Всегда приводи примеры кода."
              className="w-full bg-gray-50 text-charcoal rounded-3xl p-5 min-h-[160px] resize-none focus:outline-none focus:ring-2 focus:ring-lime/50 border border-gray-100 placeholder-gray-400 text-base"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                onSave(instruction);
                onClose();
              }}
              className="flex-1 py-4 rounded-2xl font-bold text-charcoal bg-lime hover:bg-[#b0e61a] shadow-glow transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
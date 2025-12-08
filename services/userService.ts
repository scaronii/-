
import { supabase } from '../lib/supabase';
import { ChatSession, Message, TelegramUser } from '../types';

export const userService = {
  // Инициализация пользователя при входе
  async initUser(tgUser: TelegramUser) {
    if (!supabase) {
      console.warn("Supabase client not initialized. Skipping user init.");
      return null;
    }

    try {
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      if (!existingUser) {
        console.log(`Creating new user: ${tgUser.id}`);
        const { data, error: insertError } = await supabase
          .from('users')
          .insert([{
            telegram_id: tgUser.id,
            first_name: tgUser.first_name,
            username: tgUser.username,
            balance: 100 
          }])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating user:', insertError);
          return null;
        }
        return data;
      }

      return existingUser;
    } catch (e) {
      console.error("Unexpected error in initUser:", e);
      return null;
    }
  },

  async getBalance(userId: number) {
    if (!supabase) return 0;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('telegram_id', userId)
        .single();
      if (error) return 0;
      return data?.balance ?? 0;
    } catch (e) {
      return 0;
    }
  },

  async getUserMessageCount(userId: number) {
    if (!supabase) return 100;
    try {
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .eq('user_id', userId);
        
      if (!chats || chats.length === 0) return 0;
      const chatIds = chats.map(c => c.id);
      
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('chat_id', chatIds)
        .eq('role', 'user');
        
      if (error) return 100;
      return count || 0;
    } catch (e) {
      return 100;
    }
  },
  
  async getUserImageCount(userId: number) {
    if (!supabase) return 0;
    try {
      const { count, error } = await supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return 0;
      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  async getUserVideoCount(userId: number) {
    if (!supabase) return 0;
    try {
      const { count, error } = await supabase
        .from('generated_videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return 0;
      return count || 0;
    } catch (e) {
      return 0;
    }
  },
  
  async saveGeneratedImage(userId: number, url: string, prompt: string, model: string) {
    if (!supabase) return;
    try {
      await supabase
        .from('generated_images')
        .insert([{
          user_id: userId,
          url: url,
          prompt: prompt,
          model: model
        }]);
    } catch (e) {
      console.error("Error saving generated image:", e);
    }
  },

  async saveGeneratedVideo(userId: number, url: string, prompt: string, model: string) {
    if (!supabase) return;
    try {
      await supabase
        .from('generated_videos')
        .insert([{
          user_id: userId,
          url: url,
          prompt: prompt,
          model: model
        }]);
    } catch (e) {
      console.error("Error saving generated video:", e);
    }
  },

  async getUserContent(userId: number, type: 'image' | 'video') {
    if (!supabase) return [];
    try {
      const table = type === 'image' ? 'generated_images' : 'generated_videos';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`Error fetching ${type} content:`, error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error(`Error in getUserContent (${type}):`, e);
      return [];
    }
  },

  async deductTokens(userId: number, amount: number) {
    if (!supabase) return;
    try {
      const current = await this.getBalance(userId);
      const newBalance = Math.max(0, current - amount);

      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('telegram_id', userId);

      if (error) console.error("Error deducting tokens:", error);
      return newBalance;
    } catch (e) {
      console.error("Error in deductTokens:", e);
      return undefined;
    }
  },

  async getUserChats(userId: number): Promise<ChatSession[]> {
    if (!supabase) return [];
    try {
      const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !chats) return [];

      const sessions: ChatSession[] = [];
      for (const chat of chats) {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: true });

        sessions.push({
          id: chat.id,
          title: chat.title || 'Новый чат',
          modelId: chat.model_id || 'gemini-2.5-flash',
          updatedAt: new Date(chat.created_at).getTime(),
          messages: (messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            timestamp: new Date(m.created_at).getTime()
          }))
        });
      }
      return sessions;
    } catch (e) {
      return [];
    }
  },

  async createChat(userId: number, title: string, modelId: string): Promise<string | null> {
    if (!supabase) return Date.now().toString();
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([{
          user_id: userId,
          title: title,
          model_id: modelId
        }])
        .select()
        .single();
      if (error) return null;
      return data.id;
    } catch (e) {
      return null;
    }
  },

  async saveMessage(chatId: string, role: 'user' | 'model', text: string) {
    if (!supabase) return;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatId);
    if (!isUUID) return;
    try {
      await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          role: role,
          text: text
        }]);
    } catch (e) {
      console.error("Error saving message:", e);
    }
  },

  async deleteChat(chatId: string) {
    if (!supabase) return false;
    try {
      // Assuming Cascade Delete is set up in Supabase for messages
      // If not, we would delete messages here first:
      // await supabase.from('messages').delete().eq('chat_id', chatId);
      
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('Error deleting chat:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Error in deleteChat:", e);
      return false;
    }
  }
};

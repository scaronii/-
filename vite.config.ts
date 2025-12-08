
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Загружаем переменные из .env файла (локально)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Объединяем с системными переменными (Vercel)
  const processEnv = { ...env, ...process.env };

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    // Пробрасываем переменные внутрь React приложения
    define: {
      // Polyfill для Node.js process.env
      'process.env': {
         API_KEY: processEnv.OPENROUTER_API_KEY || processEnv.VITE_API_KEY || processEnv.NEXT_PUBLIC_API_KEY || '',
         OPENROUTER_API_KEY: processEnv.OPENROUTER_API_KEY || '',
         
         // Supabase URL
         NEXT_PUBLIC_SUPABASE_URL: processEnv.NEXT_PUBLIC_SUPABASE_URL || processEnv.VITE_SUPABASE_URL || '',
         VITE_SUPABASE_URL: processEnv.NEXT_PUBLIC_SUPABASE_URL || processEnv.VITE_SUPABASE_URL || '',
         
         // Supabase Key
         NEXT_PUBLIC_SUPABASE_ANON_KEY: processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || processEnv.VITE_SUPABASE_ANON_KEY || '',
         VITE_SUPABASE_ANON_KEY: processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || processEnv.VITE_SUPABASE_ANON_KEY || '',
         
         // Server-side only (for reference, though mostly used in API routes)
         SUPABASE_SERVICE_ROLE_KEY: processEnv.SUPABASE_SERVICE_ROLE_KEY || ''
      }
    },
    server: {
      port: 3000,
      proxy: {
        // Proxy requests to OpenAI via local dev server to bypass CORS/Region locks during dev
        '/openai-api': {
          target: 'https://openrouter.ai/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/openai-api/, '')
        }
      }
    }
  };
});

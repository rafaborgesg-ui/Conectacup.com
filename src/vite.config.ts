import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Configuração de build para produção
  build: {
    outDir: 'dist', // Mudado de 'build' para 'dist' (padrão Vercel)
    sourcemap: false,
    minify: 'terser',
    
    // Otimizações de chunk
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'motion/react'],
          'chart-vendor': ['recharts'],
          'scanner-vendor': ['@zxing/library'],
          'excel-vendor': ['xlsx'],
          'utils-vendor': ['date-fns', 'dompurify'],
        },
      },
    },
    
    // Aumenta o limite de aviso para chunks grandes
    chunkSizeWarningLimit: 1000,
    
    // Otimizações adicionais
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  
  // Configuração de servidor para desenvolvimento
  server: {
    port: 3000,
    open: true,
  },
  
  // Configuração de preview
  preview: {
    port: 8080,
  },
  
  // Resolve paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@utils': path.resolve(__dirname, './utils'),
      '@styles': path.resolve(__dirname, './styles'),
    },
  },
  
  // Otimizações de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'recharts',
      '@zxing/library',
    ],
  },
});
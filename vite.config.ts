
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel 환경 변수를 process.env로 접근 가능하게 설정
    'process.env': process.env
  }
});

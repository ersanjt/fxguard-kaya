import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** خروجی بیلد داخل public بک‌اند تا Express همان مسیرها را سرو کند */
const OUT_DIR = path.resolve(__dirname, '../backend/public/js/app');

export default defineConfig({
    root: __dirname,
    base: '/js/app/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@core': path.resolve(__dirname, 'src/core'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@platform': path.resolve(__dirname, 'src/platform')
        }
    },
    build: {
        outDir: OUT_DIR,
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: path.resolve(__dirname, 'index.html'),
            output: {
                manualChunks: undefined,
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            }
        }
    },
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://127.0.0.1:3000',
                ws: true
            }
        }
    }
});

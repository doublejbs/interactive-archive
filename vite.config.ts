import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: '/index.html',
        particle: '/projects/particle/index.html',
        avatarNetwork: '/projects/avatar-network/index.html',
      },
    },
  },
});


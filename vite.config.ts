import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: '/index.html',
        particle: '/projects/particle/index.html',
        avatarNetwork: '/projects/avatar-network/index.html',
        robot: '/projects/robot/index.html',
        rain: '/projects/rain/index.html',
        interstellar: '/projects/interstellar/index.html',
        avatarToruk: '/projects/avatar-toruk/index.html',
        dodgePoop: '/projects/dodge-poop/index.html',
      },
    },
  },
});


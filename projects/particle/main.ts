import ParticleApp from './ParticleApp';

// 앱 초기화
const container = document.getElementById('canvas-container');

if (container) {
    const app = ParticleApp.create(container);
    app.start();
}


import App from './App';

// 앱 초기화
const container = document.getElementById('canvas-container');

if (container) {
    const app = App.create(container);
    app.start();
}


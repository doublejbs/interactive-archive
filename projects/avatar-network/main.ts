import AvatarNetworkApp from './AvatarNetworkApp';

// 앱 초기화
const container = document.getElementById('canvas-container');

if (container) {
    const app = AvatarNetworkApp.create(container);
    app.start();
}


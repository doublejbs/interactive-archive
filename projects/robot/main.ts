import RobotApp from './RobotApp';

// 앱 초기화
const container = document.getElementById('canvas-container');

if (container) {
    const app = RobotApp.create(container);
    app.start();
}


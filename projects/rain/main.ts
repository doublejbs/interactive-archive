import RainApp from './RainApp';

const container = document.getElementById('canvas-container');

if (container) {
    const app = RainApp.create(container);
    app.start();
}

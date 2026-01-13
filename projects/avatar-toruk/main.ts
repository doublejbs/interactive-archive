import TorukApp from './TorukApp';

const container = document.getElementById('canvas-container');

if (container) {
    const app = TorukApp.create(container);
    app.start();
}

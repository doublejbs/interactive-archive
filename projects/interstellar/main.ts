import InterstellarApp from './InterstellarApp';

const container = document.getElementById('canvas-container');

if (container) {
    const app = InterstellarApp.create(container);
    app.start();
}

import VideoPuzzleApp from './VideoPuzzleApp';

const container = document.getElementById('puzzle-container');

if (container) {
    const app = new VideoPuzzleApp(container);

    document.getElementById('shuffle-btn')?.addEventListener('click', () => app.shuffle());
    document.getElementById('solve-btn')?.addEventListener('click', () => app.solve());
}

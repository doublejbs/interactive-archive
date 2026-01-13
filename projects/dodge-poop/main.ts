import DodgeApp from './DodgeApp';

const container = document.getElementById('canvas-container');

if (container) {
    const app = DodgeApp.create(container);
    app.start();

    // UI Bindings
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            app.restart();
            const screen = document.getElementById('game-over-screen');
            if (screen) screen.style.display = 'none';
        });
    }
}

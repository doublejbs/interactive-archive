/**
 * Video Sliding Puzzle Application
 */
/**
 * Video Swap Puzzle Application
 */
class VideoPuzzleApp {
    private container: HTMLElement;
    private video: HTMLVideoElement;
    private canvases: HTMLCanvasElement[] = [];
    private tiles: { originalIndex: number, currentIndex: number }[] = [];

    // Config
    private readonly rows = 3;
    private readonly cols = 3;
    private get totalTiles() { return this.rows * this.cols; }

    private tileWidth = 0;
    private tileHeight = 0;

    private isShuffling = false;
    private selectedIndex: number | null = null; // Currently selected tile index (current position)

    constructor(container: HTMLElement) {
        this.container = container;

        // Setup Video
        this.video = document.createElement('video');
        this.video.src = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        this.video.crossOrigin = 'anonymous';
        this.video.loop = true;
        this.video.muted = true;
        this.video.playsInline = true;

        this.video.addEventListener('loadedmetadata', this.handleVideoLoad.bind(this));

        this.video.play().catch(e => console.error("Autoplay failed", e));

        // Initialize Grid State (0 to 8)
        for (let i = 0; i < this.totalTiles; i++) {
            this.tiles.push({
                originalIndex: i,
                currentIndex: i
            });
        }

        this.startRenderLoop();
    }

    private handleVideoLoad(): void {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const scale = maxWidth / this.video.videoWidth;
        const width = this.video.videoWidth * scale;
        const height = this.video.videoHeight * scale;

        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;

        this.tileWidth = width / this.cols;
        this.tileHeight = height / this.rows;

        this.createTiles();
    }

    private createTiles(): void {
        this.container.innerHTML = '';
        this.canvases = [];

        // Create canvas for EVERY tile (unlike sliding puzzle which has one empty)
        for (let i = 0; i < this.totalTiles; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = this.tileWidth;
            canvas.height = this.tileHeight;
            canvas.className = 'tile';
            canvas.style.border = '1px solid rgba(255,255,255,0.2)';
            canvas.style.boxSizing = 'border-box';

            this.updateTilePosition(canvas, i);

            // Interaction: Click to swap
            canvas.addEventListener('mousedown', () => this.handleTileClick(i));

            this.container.appendChild(canvas);
            this.canvases[i] = canvas;
        }
    }

    private updateTilePosition(el: HTMLElement, indexInGrid: number): void {
        const r = Math.floor(indexInGrid / this.cols);
        const c = indexInGrid % this.cols;

        el.style.width = `${this.tileWidth}px`;
        el.style.height = `${this.tileHeight}px`;
        el.style.transform = `translate(${c * this.tileWidth}px, ${r * this.tileHeight}px)`;
    }

    private handleTileClick(originalIndex: number): void {
        if (this.isShuffling) return;

        // Find current grid position of this clicked tile
        const currentPos = this.tiles.findIndex(t => t.originalIndex === originalIndex);
        if (currentPos === -1) return;

        // 1. If nothing selected, select this one
        if (this.selectedIndex === null) {
            this.selectedIndex = currentPos;
            this.highlightTile(this.canvases[originalIndex], true);
        }
        // 2. If same tile clicked, deselect
        else if (this.selectedIndex === currentPos) {
            this.highlightTile(this.canvases[originalIndex], false);
            this.selectedIndex = null;
        }
        // 3. If different tile clicked, SWAP!
        else {
            const firstSelectedOriginalIndex = this.tiles[this.selectedIndex].originalIndex;

            // Remove highlight from previous
            this.highlightTile(this.canvases[firstSelectedOriginalIndex], false);

            // Swap
            this.swap(this.selectedIndex, currentPos);

            this.selectedIndex = null;
        }
    }

    private highlightTile(canvas: HTMLCanvasElement, active: boolean): void {
        if (active) {
            canvas.style.borderColor = '#ff0000';
            canvas.style.zIndex = '10';
            canvas.style.boxShadow = '0 0 10px #ff0000';
        } else {
            canvas.style.borderColor = 'rgba(255,255,255,0.2)';
            canvas.style.zIndex = '';
            canvas.style.boxShadow = '';
        }
    }

    private swap(idx1: number, idx2: number): void {
        // Swap data
        [this.tiles[idx1], this.tiles[idx2]] = [this.tiles[idx2], this.tiles[idx1]];

        // Update visuals for both tiles involved
        const tile1 = this.tiles[idx1];
        const tile2 = this.tiles[idx2];

        this.updateTilePosition(this.canvases[tile1.originalIndex], idx1);
        this.updateTilePosition(this.canvases[tile2.originalIndex], idx2);

        if (!this.isShuffling) {
            this.checkSolved();
        }
    }

    private checkSolved(): void {
        const isSolved = this.tiles.every((t, i) => t.originalIndex === i);
        const msg = document.getElementById('success-message');
        if (msg) {
            msg.style.display = isSolved ? 'block' : 'none';
        }
    }

    public async shuffle(): Promise<void> {
        if (this.isShuffling) return;
        this.isShuffling = true;

        // Hide success message
        const msg = document.getElementById('success-message');
        if (msg) msg.style.display = 'none';

        // Deselect if any
        if (this.selectedIndex !== null) {
            const originalIndex = this.tiles[this.selectedIndex].originalIndex;
            this.highlightTile(this.canvases[originalIndex], false);
            this.selectedIndex = null;
        }

        // Random swaps
        for (let i = 0; i < 20; i++) {
            const idx1 = Math.floor(Math.random() * this.totalTiles);
            const idx2 = Math.floor(Math.random() * this.totalTiles);

            if (idx1 !== idx2) {
                this.swap(idx1, idx2);
                await new Promise(r => setTimeout(r, 50));
            }
        }

        this.isShuffling = false;
    }

    public solve(): void {
        // Deselect
        if (this.selectedIndex !== null) {
            const originalIndex = this.tiles[this.selectedIndex].originalIndex;
            this.highlightTile(this.canvases[originalIndex], false);
            this.selectedIndex = null;
        }

        // Just resort to solved logical state
        // Re-construct the tiles array to match solved state
        // Actually we need to move them one by one or just reset visuals

        // Simple way: restore Data state
        this.tiles.sort((a, b) => a.originalIndex - b.originalIndex);

        // Update all positions
        for (let i = 0; i < this.totalTiles; i++) {
            const tile = this.tiles[i];
            this.updateTilePosition(this.canvases[tile.originalIndex], i);
        }

        this.checkSolved();
    }

    private startRenderLoop(): void {
        const render = () => {
            if (this.video.readyState >= 2) {
                const srcW = this.video.videoWidth / this.cols;
                const srcH = this.video.videoHeight / this.rows;

                for (let i = 0; i < this.totalTiles; i++) {
                    const canvas = this.canvases[i];
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const r = Math.floor(i / this.cols);
                        const c = i % this.cols;

                        ctx.drawImage(
                            this.video,
                            c * srcW, r * srcH, srcW, srcH,
                            0, 0, this.tileWidth, this.tileHeight
                        );
                    }
                }
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }
}

export default VideoPuzzleApp;

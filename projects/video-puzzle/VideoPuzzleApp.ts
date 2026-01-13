/**
 * Video Sliding Puzzle Application
 */
class VideoPuzzleApp {
    private container: HTMLElement;
    private video: HTMLVideoElement;
    private canvases: HTMLCanvasElement[] = [];
    private tiles: { originalIndex: number, currentIndex: number }[] = [];
    private emptyIndex: number;

    private readonly rows = 6;
    private readonly cols = 6;
    private readonly totalTiles = 36;
    private tileWidth = 0;
    private tileHeight = 0;

    private isShuffling = false;

    constructor(container: HTMLElement) {
        this.container = container;

        // Setup Video
        this.video = document.createElement('video');
        this.video.src = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        this.video.crossOrigin = 'anonymous'; // Important for canvas
        this.video.loop = true;
        this.video.muted = true;
        this.video.playsInline = true;

        // Wait for metadata to resize container
        this.video.addEventListener('loadedmetadata', this.handleVideoLoad.bind(this));

        // Start playback
        this.video.play().catch(e => console.error("Autoplay failed", e));

        // Initialize Grid State
        // 0 to 35. 35 is empty.
        this.emptyIndex = this.totalTiles - 1;
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

        for (let i = 0; i < this.totalTiles; i++) {
            // Skip creating canvas for the empty tile (initially the last one)
            // Actually, let's keep it null in the array or just create it but hide it?
            // Better to strictly align canvases with originalIndex or currentIndex?
            // Strategy: Create canvases for tiles 0-34. Tile 35 is "empty".
            // When rendering, we iterate through `this.tiles`. Use `originalIndex` to find source rect.

            if (i === this.totalTiles - 1) continue; // The empty "piece" has no canvas

            const canvas = document.createElement('canvas');
            canvas.width = this.tileWidth;
            canvas.height = this.tileHeight;
            canvas.className = 'tile';

            // Set initial position
            this.updateTilePosition(canvas, i);

            // Click handler
            // We need to know WHICH tile index this canvas corresponds to currently.
            // Since `tiles` array tracks order, we search for the tile with `originalIndex == i`.
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

        // Find where this piece currently is
        const currentPos = this.tiles.findIndex(t => t.originalIndex === originalIndex);
        if (currentPos === -1) return;

        // Check adjacency to empty
        if (this.isAdjacent(currentPos, this.emptyIndex)) {
            this.swap(currentPos, this.emptyIndex);
            this.emptyIndex = currentPos;
        }
    }

    private isAdjacent(idx1: number, idx2: number): boolean {
        const r1 = Math.floor(idx1 / this.cols);
        const c1 = idx1 % this.cols;

        const r2 = Math.floor(idx2 / this.cols);
        const c2 = idx2 % this.cols;

        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
    }

    private swap(idx1: number, idx2: number): void {
        // Swap in logical array
        [this.tiles[idx1], this.tiles[idx2]] = [this.tiles[idx2], this.tiles[idx1]];

        // Update visuals
        // We need to update position of the tile that MOVED.
        // The one that was at idx1 is now at idx2.
        // If it's valid (not the empty piece), update its CSS.

        const tileAt1 = this.tiles[idx1];
        if (tileAt1.originalIndex !== this.totalTiles - 1) {
            this.updateTilePosition(this.canvases[tileAt1.originalIndex], idx1);
        }

        const tileAt2 = this.tiles[idx2];
        if (tileAt2.originalIndex !== this.totalTiles - 1) {
            this.updateTilePosition(this.canvases[tileAt2.originalIndex], idx2);
        }
    }

    public async shuffle(): Promise<void> {
        if (this.isShuffling) return;
        this.isShuffling = true;

        // Perform random valid moves
        // (Just random swapping isn't sufficient as it might not be valid puzzle moves, 
        // we must slide the empty tile)

        for (let i = 0; i < 150; i++) {
            // Find neighbors of empty
            const neighbors: number[] = [];
            const r = Math.floor(this.emptyIndex / this.cols);
            const c = this.emptyIndex % this.cols;

            if (r > 0) neighbors.push(this.emptyIndex - this.cols);
            if (r < this.rows - 1) neighbors.push(this.emptyIndex + this.cols);
            if (c > 0) neighbors.push(this.emptyIndex - 1);
            if (c < this.cols - 1) neighbors.push(this.emptyIndex + 1);

            // Pick random neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Swap
            this.swap(this.emptyIndex, next);
            this.emptyIndex = next;

            // Slight delay for animation if desired, or instant
            await new Promise(r => setTimeout(r, 10));
        }

        this.isShuffling = false;
    }

    public solve(): void {
        // Reset to initial state
        this.tiles.sort((a, b) => a.originalIndex - b.originalIndex);

        // Update grid positions
        for (let i = 0; i < this.tiles.length; i++) {
            if (this.tiles[i].originalIndex !== this.totalTiles - 1) {
                this.updateTilePosition(this.canvases[this.tiles[i].originalIndex], i);
            }
        }

        this.emptyIndex = this.totalTiles - 1;
    }

    private startRenderLoop(): void {
        const render = () => {
            if (this.video.readyState >= 2) {
                // Determine source dimensions based on actual video size
                const srcW = this.video.videoWidth / this.cols;
                const srcH = this.video.videoHeight / this.rows;

                // For each tile canvas
                for (let i = 0; i < this.totalTiles - 1; i++) {
                    const canvas = this.canvases[i];
                    if (!canvas) continue;

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        // Original position determines what part of video to show
                        const r = Math.floor(i / this.cols);
                        const c = i % this.cols;

                        ctx.drawImage(
                            this.video,
                            c * srcW, r * srcH, srcW, srcH, // Source
                            0, 0, this.tileWidth, this.tileHeight // Dest
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

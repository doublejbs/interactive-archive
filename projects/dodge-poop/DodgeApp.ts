import * as THREE from 'three';

/**
 * Dodge Poop 3D Game
 */
class DodgeApp {
    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;

    // Game State
    private isPlaying: boolean = true;
    private score: number = 0;
    private timeElapsed: number = 0;
    private spawnRate: number = 0.5; // Seconds between spawns
    private lastSpawnTime: number = 0;

    // Objects
    private player: THREE.Mesh | null;
    private enemies: THREE.Mesh[] = [];
    private floor: THREE.Mesh | null;

    // Inputs
    private keys: { [key: string]: boolean } = {};
    private animationId: number | null = null;

    // Constants
    private static readonly PLAYER_SPEED = 15;
    private static readonly FIELD_SIZE = 20;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.clock = new THREE.Clock();
        this.player = null;
        this.floor = null;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
        this.camera.position.set(0, 15, 20);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.setupScene();
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): DodgeApp {
        return new DodgeApp(container);
    }

    private setupScene(): void {
        // Lights
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        this.scene.add(dirLight);

        // Floor (Grass)
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        // Grid Helper
        const grid = new THREE.GridHelper(50, 50, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);

        // Player
        const playerGeo = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const playerMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
        this.player = new THREE.Mesh(playerGeo, playerMat);
        this.player.position.y = 1;
        this.player.castShadow = true;
        this.scene.add(this.player);
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    private handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private spawnEnemy(): void {
        // "Poop" Mesh
        // A rough sphere or something similar
        const geo = new THREE.DodecahedronGeometry(0.6); // Low poly sphere look
        const mat = new THREE.MeshStandardMaterial({ color: 0x8d6e63 }); // Brown
        const enemy = new THREE.Mesh(geo, mat);

        // Random Position
        const range = DodgeApp.FIELD_SIZE;
        const x = (Math.random() - 0.5) * range;
        const z = (Math.random() - 0.5) * range;

        enemy.position.set(x, 20, z); // Start high
        enemy.castShadow = true;

        // Add random rotation speed to userData
        enemy.userData = {
            rotSpeed: {
                x: Math.random() * 2,
                y: Math.random() * 2
            },
            fallSpeed: 5 + Math.random() * 5 + (this.score * 0.1) // Get faster over time
        };

        this.scene.add(enemy);
        this.enemies.push(enemy);
    }

    public restart(): void {
        // Clear enemies
        this.enemies.forEach(e => this.scene.remove(e));
        this.enemies = [];

        // Reset state
        this.isPlaying = true;
        this.score = 0;
        this.timeElapsed = 0;
        this.lastSpawnTime = 0;

        // Reset player
        if (this.player) {
            this.player.position.set(0, 1, 0);
        }

        this.updateScoreUI();
    }

    private updateScoreUI(): void {
        const el = document.getElementById('score-display');
        if (el) el.textContent = `Score: ${Math.floor(this.score)}`;
    }

    private gameOver(): void {
        this.isPlaying = false;
        const screen = document.getElementById('game-over-screen');
        const finalScore = document.getElementById('final-score');
        if (screen && finalScore) {
            finalScore.textContent = `Score: ${Math.floor(this.score)}`;
            screen.style.display = 'block';
        }
    }

    private update(delta: number): void {
        if (!this.isPlaying || !this.player) return;

        // --- Player Movement ---
        const move = new THREE.Vector3(0, 0, 0);
        if (this.keys['ArrowUp'] || this.keys['KeyW']) move.z -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) move.z += 1;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) move.x -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) move.x += 1;

        if (move.length() > 0) {
            move.normalize().multiplyScalar(DodgeApp.PLAYER_SPEED * delta);
            this.player.position.add(move);

            // Constrain to field
            const limit = DodgeApp.FIELD_SIZE / 2;
            this.player.position.x = THREE.MathUtils.clamp(this.player.position.x, -limit, limit);
            this.player.position.z = THREE.MathUtils.clamp(this.player.position.z, -limit, limit);
        }

        // --- Spawning ---
        this.timeElapsed += delta;
        if (this.timeElapsed - this.lastSpawnTime > this.spawnRate) {
            this.spawnEnemy();
            this.lastSpawnTime = this.timeElapsed;

            // Increase difficulty
            this.spawnRate = Math.max(0.1, 0.5 - (this.score * 0.005));
        }

        // --- Enemy Logic ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const data = e.userData;

            // Fall
            e.position.y -= data.fallSpeed * delta;
            e.rotation.x += data.rotSpeed.x * delta;
            e.rotation.y += data.rotSpeed.y * delta;

            // Check Collision
            const dist = e.position.distanceTo(this.player.position);
            if (dist < 1.0) { // Simple radius check
                this.gameOver();
            }

            // Remove if hit floor
            if (e.position.y < 0) {
                // "Splat" effect? Just simple removal for now
                this.scene.remove(e);
                this.enemies.splice(i, 1);
                this.score += 10;
                this.updateScoreUI();
            }
        }
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        const delta = Math.min(this.clock.getDelta(), 0.1);
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    }

    public start(): void {
        this.animate();
    }
}

export default DodgeApp;

import * as THREE from 'three';

/**
 * Rain Animation App
 * Rain falls from the sky and bounces off a semi-circle around the mouse cursor.
 */
class RainApp {
    private static readonly PARTICLE_COUNT = 10000;
    private static readonly RAIN_RANGE_X = 40;
    private static readonly RAIN_RANGE_Y = 30; // Height to fall from
    private static readonly RAIN_RANGE_Z = 10;
    private static readonly GRAVITY = 5.0;
    private static readonly UMBRELLA_RADIUS = 3.0;
    private static readonly BOUNCE_FORCE = 0.5;

    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;

    private animationId: number | null;
    private particles: THREE.Points | null;
    private velocities: Float32Array; // Store velocities separately for physics
    private geometry: THREE.BufferGeometry | null;

    private mouse: THREE.Vector2;
    private mouseWorldPos: THREE.Vector3;
    private raycaster: THREE.Raycaster;
    private interactionPlane: THREE.Plane;

    private lightningTimer: number;
    private lightningIntensity: number;
    private lightningBolt: THREE.Line | null;
    private lightningMaterial: THREE.LineBasicMaterial | null;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.particles = null;
        this.velocities = new Float32Array(RainApp.PARTICLE_COUNT * 3);
        this.geometry = null;

        this.mouse = new THREE.Vector2(9999, 9999); // Off-screen initially
        this.mouseWorldPos = new THREE.Vector3(9999, 9999, 0);
        this.raycaster = new THREE.Raycaster();
        this.interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plane at Z=0

        this.lightningTimer = Math.random() * 3 + 1; // 1 ~ 4 seconds
        this.lightningIntensity = 0;
        this.lightningBolt = null;
        this.lightningMaterial = null;

        // Scene init
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510); // Dark blue-ish night sky

        // Fog for depth
        this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

        // Camera init
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 20;

        // Renderer init
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        this.setupScene();
        this.setupLightning();
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): RainApp {
        return new RainApp(container);
    }

    private setupScene(): void {
        // Create particles
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(RainApp.PARTICLE_COUNT * 3);

        for (let i = 0; i < RainApp.PARTICLE_COUNT; i++) {
            this.resetParticle(positions, i, true);
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Material - Streaks for rain
        const material = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        this.particles = new THREE.Points(this.geometry, material);
        this.scene.add(this.particles);

        // Add some ambient light
        const ambientLight = new THREE.AmbientLight(0x404080, 2.0);
        this.scene.add(ambientLight);
    }

    private setupLightning(): void {
        const geometry = new THREE.BufferGeometry();
        // Reserve buffer for max segments (e.g. 50 points)
        const positions = new Float32Array(50 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0); // Hide initially

        this.lightningMaterial = new THREE.LineBasicMaterial({
            color: 0xaabbff,
            linewidth: 2, // Note: WebGL linewidth is often limited to 1
            transparent: true,
            opacity: 0
        });

        this.lightningBolt = new THREE.Line(geometry, this.lightningMaterial);
        this.scene.add(this.lightningBolt);
    }

    private triggerLightning(): void {
        if (!this.lightningBolt) return;

        const rangeX = 20;
        const startX = (Math.random() - 0.5) * rangeX;
        const startY = 15;
        const endY = -15;

        const points: number[] = [];
        let currentX = startX;
        let currentY = startY;

        points.push(currentX, currentY, 0); // Start point, at Z=0 for better visibility

        const segments = 20;
        const stepY = (startY - endY) / segments;

        for (let i = 0; i < segments; i++) {
            currentY -= stepY;
            // Random jagged offset
            const xOffset = (Math.random() - 0.5) * 2.0;
            currentX += xOffset;

            // Bias back towards center if too far out
            if (Math.abs(currentX - startX) > 5) {
                currentX += (startX - currentX) * 0.5;
            }

            points.push(currentX, currentY, 0);

            // Random chance to branch? (Keep simple for now)
        }

        const positions = this.lightningBolt.geometry.attributes.position.array as Float32Array;
        let validPoints = 0;
        for (let i = 0; i < points.length; i++) {
            positions[i] = points[i];
            validPoints++;
        }

        this.lightningBolt.geometry.setDrawRange(0, validPoints / 3);
        this.lightningBolt.geometry.attributes.position.needsUpdate = true;
    }

    // Initialize or reset a particle
    private resetParticle(positions: Float32Array, index: number, initial: boolean = false) {
        const i3 = index * 3;

        positions[i3] = (Math.random() - 0.5) * RainApp.RAIN_RANGE_X; // X

        if (initial) {
            positions[i3 + 1] = (Math.random() - 0.5) * RainApp.RAIN_RANGE_Y; // Y
        } else {
            positions[i3 + 1] = RainApp.RAIN_RANGE_Y / 2; // Start at top
        }

        positions[i3 + 2] = (Math.random() - 0.5) * RainApp.RAIN_RANGE_Z; // Z

        // Initial downward velocity
        this.velocities[i3] = 0; // vx
        this.velocities[i3 + 1] = -(Math.random() * 5 + 5); // vy (falling speed)
        this.velocities[i3 + 2] = 0; // vz
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Touch support for mobile
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
            }
        }, { passive: false });
    }

    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event.clientX, event.clientY);
    }

    private updateMousePosition(clientX: number, clientY: number): void {
        // Normalize mouse coordinates
        this.mouse.x = (clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -(clientY / this.container.clientHeight) * 2 + 1;

        // Raycast to find world position on Z=0 plane
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.interactionPlane, target);

        if (target) {
            this.mouseWorldPos.copy(target);
        }
    }

    private handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    private update(delta: number): void {
        if (!this.particles || !this.geometry) return;

        const positions = this.geometry.attributes.position.array as Float32Array;

        // --- Lightning Effect ---
        this.lightningTimer -= delta;
        if (this.lightningTimer <= 0) {
            // Trigger lightning
            this.lightningIntensity = 1.0;
            this.lightningTimer = Math.random() * 5 + 2; // Random interval 2~7s
            this.triggerLightning();
        }

        if (this.lightningIntensity > 0) {
            this.lightningIntensity -= delta * 3.0; // Fade out speed
            if (this.lightningIntensity < 0) this.lightningIntensity = 0;

            // Update bolt opacity
            if (this.lightningMaterial) {
                this.lightningMaterial.opacity = this.lightningIntensity;
            }
        } else {
            // Hide bolt completely when done
            if (this.lightningBolt) {
                this.lightningBolt.geometry.setDrawRange(0, 0);
            }
        }


        for (let i = 0; i < RainApp.PARTICLE_COUNT; i++) {
            const i3 = i * 3;

            // Physics Update
            let x = positions[i3];
            let y = positions[i3 + 1];
            let z = positions[i3 + 2];

            let vx = this.velocities[i3];
            let vy = this.velocities[i3 + 1];
            let vz = this.velocities[i3 + 2];

            // Apply Gravity
            // Only apply gravity if not currently bouncing violently upwards?
            // Actually rain reaches terminal velocity quickly, we can just keep adding gravity
            // but cap the max speed if needed. For visual rain, constant high speed is fine.
            // But for bounce effect, we probably want gravity to bring it back down.
            vy -= RainApp.GRAVITY * delta;

            // --- Mouse Interaction (Umbrella) ---
            // Calculate distance to mouse sphere
            // We only care about X and Y for the 'semi-circle' visual in 2D projection essentially,
            // but doing it in 3D gives a nicer volumetric feel.
            const dx = x - this.mouseWorldPos.x;
            const dy = y - this.mouseWorldPos.y;
            const dz = z - this.mouseWorldPos.z;

            const distSq = dx * dx + dy * dy + dz * dz;
            const radiusSq = RainApp.UMBRELLA_RADIUS * RainApp.UMBRELLA_RADIUS;

            // Check if particle is inside the umbrella sphere AND falling (or moving relative to it)
            // Visual tweak: Only reflect if it's 'above' the mouse somewhat or just generally inside?
            // User asked for "semi-circle shape around the mouse".
            // Let's treat it as a solid sphere obstacle.

            if (distSq < radiusSq) {
                // Collision detected!
                const dist = Math.sqrt(distSq);

                // Normal vector from mouse center to particle
                const nx = dx / dist;
                const ny = dy / dist;
                const nz = dz / dist;

                // If it's the upper hemisphere (y > mouse.y mostly, but general sphere works too)
                if (ny > 0) {
                    // Bounce logic: Reflect velocity vector across normal
                    // V_new = V - 2(V . N)N
                    // Add some elasticity/bounce force

                    const dot = vx * nx + vy * ny + vz * nz;

                    // Only bounce if moving towards the center (dot < 0)
                    if (dot < 0) {
                        vx = vx - 2 * dot * nx;
                        vy = vy - 2 * dot * ny;
                        vz = vz - 2 * dot * nz;

                        // Add extra 'push' to make it look energetic
                        vx += nx * RainApp.BOUNCE_FORCE;
                        vy += ny * RainApp.BOUNCE_FORCE;
                        vz += nz * RainApp.BOUNCE_FORCE;

                        // Immediate position correction to push it out of the sphere
                        // so it doesn't get stuck
                        const pushOut = RainApp.UMBRELLA_RADIUS - dist + 0.05;
                        x += nx * pushOut;
                        y += ny * pushOut;
                        z += nz * pushOut;
                    }
                }
            }

            // Apply Drag / Air resistance (simple damping) to prevent explosion
            vx *= 0.99;
            // vy *= 0.99; // Don't damp Y too much or rain stops falling fast
            vz *= 0.99;

            // Update Position
            x += vx * delta;
            y += vy * delta;
            z += vz * delta;

            // Reset if out of bounds (Bottom of screen)
            if (y < -RainApp.RAIN_RANGE_Y / 2) {
                this.resetParticle(positions, i);
                // Read back new values
                x = positions[i3];
                y = positions[i3 + 1];
                z = positions[i3 + 2];
                // Reset velocity logic is inside resetParticle
                vx = this.velocities[i3];
                vy = this.velocities[i3 + 1];
                vz = this.velocities[i3 + 2];
            }

            // Store back
            positions[i3] = x;
            positions[i3 + 1] = y;
            positions[i3 + 2] = z;

            this.velocities[i3] = vx;
            this.velocities[i3 + 1] = vy;
            this.velocities[i3 + 2] = vz;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to prevent huge jumps
        this.update(delta);

        this.renderer.render(this.scene, this.camera);
    }

    public start(): void {
        this.animate();
    }

    public stop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

export default RainApp;

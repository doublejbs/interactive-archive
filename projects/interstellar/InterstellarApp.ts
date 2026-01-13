import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Interstellar Endurance Simulation
 */
class InterstellarApp {
    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;
    private readonly controls: OrbitControls;

    private animationId: number | null;
    private enduranceGroup: THREE.Group | null;
    private stars: THREE.Points | null;
    private wormhole: THREE.Mesh | null;

    // Movement state
    private moveSpeed = 50.0;
    private shipPosition = new THREE.Vector3(0, 0, 0);
    private prevShipPosition = new THREE.Vector3(0, 0, 0);

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.enduranceGroup = null;
        this.stars = null;
        this.wormhole = null;

        // Scene init
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Camera init
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 0, 15);

        // Renderer init
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Tone mapping for better look
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 1.5;

        this.renderer.toneMappingExposure = 1.5;

        container.appendChild(this.renderer.domElement);

        // Controls init
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.setupScene();
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): InterstellarApp {
        return new InterstellarApp(container);
    }

    private setupScene(): void {
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 2);
        sunLight.position.set(50, 20, 30);
        this.scene.add(sunLight);

        // Stars
        this.createStars();

        // Wormhole
        this.createWormhole();

        // Endurance Model
        this.createEndurance();
    }

    private createWormhole(): void {
        const geometry = new THREE.SphereGeometry(30, 64, 64);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            transmission: 1.0, // Glass-like
            thickness: 5.0,
            ior: 1.2, // Index of Refraction
            side: THREE.BackSide // Invert normal to look inside? No, just sphere
        });

        // Actually, a simple refractive sphere is good. 
        // Let's add an "accretion disk" or ring around it for visual flair?

        this.wormhole = new THREE.Mesh(geometry, material);
        this.wormhole.position.set(0, 0, -500); // Far ahead
        this.scene.add(this.wormhole);

        // Add a glowing halo
        const haloGeo = new THREE.SphereGeometry(32, 64, 64);
        const haloMat = new THREE.MeshBasicMaterial({
            color: 0xaaeeff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        this.wormhole.add(halo);
    }

    private createStars(): void {
        const geometry = new THREE.BufferGeometry();
        const count = 5000;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 1000;
            const y = (Math.random() - 0.5) * 1000;
            const z = (Math.random() - 0.5) * 1000;

            // Push stars away from center slightly
            if (Math.abs(x) < 50 && Math.abs(y) < 50 && Math.abs(z) < 50) {
                continue;
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    private createEndurance(): void {
        this.enduranceGroup = new THREE.Group();

        const hullMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.4,
            metalness: 0.6,
        });

        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.2
        });

        // 1. Central Hub
        const hubGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32);
        const hub = new THREE.Mesh(hubGeo, hullMaterial);
        hub.rotation.x = Math.PI / 2;
        this.enduranceGroup.add(hub);

        // 2. Ring Modules (12 modules)
        const ringRadius = 5.0;
        const moduleCount = 12;

        for (let i = 0; i < moduleCount; i++) {
            const angle = (i / moduleCount) * Math.PI * 2;
            const x = Math.cos(angle) * ringRadius;
            const y = Math.sin(angle) * ringRadius;

            // Box module
            const moduleGeo = new THREE.BoxGeometry(1.5, 0.8, 0.6);
            const moduleMesh = new THREE.Mesh(moduleGeo, hullMaterial);

            moduleMesh.position.set(x, y, 0);
            moduleMesh.rotation.z = angle + Math.PI / 2;

            this.enduranceGroup.add(moduleMesh);

            // Connector to previous (Ring structure)
            const nextAngle = ((i + 1) / moduleCount) * Math.PI * 2;
            const nextX = Math.cos(nextAngle) * ringRadius;
            const nextY = Math.sin(nextAngle) * ringRadius;

            // Simple logic: we don't need explicit connectors if boxes are close enough
            // But let's add thin tubes connecting them to center?

            // Spoke to center
            if (i % 3 === 0) { // 4 main spokes
                const spokeGeo = new THREE.CylinderGeometry(0.1, 0.1, ringRadius - 0.5, 8);
                const spoke = new THREE.Mesh(spokeGeo, darkMaterial);
                spoke.position.set(x / 2, y / 2, 0); // Midpoint
                spoke.rotation.z = angle - Math.PI / 2; // Perpendicular to radius? No, aligned with radius
                spoke.rotation.z = angle - Math.PI / 2;

                // Fix rotation for cylinder which defaults to Y axis
                spoke.rotation.set(0, 0, angle - Math.PI / 2);

                this.enduranceGroup.add(spoke);
            }
        }

        // Additional Ring details (Torus) to essentially merge them
        const torusGeo = new THREE.TorusGeometry(ringRadius, 0.2, 8, 64);
        const ringFrame = new THREE.Mesh(torusGeo, darkMaterial);
        this.enduranceGroup.add(ringFrame);

        this.scene.add(this.enduranceGroup);

        // Initial Tilt
        this.enduranceGroup.rotation.x = Math.PI / 6; // Tilt towards camera slightly
        this.enduranceGroup.rotation.y = -Math.PI / 6;
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));
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
        this.controls.update();

        // Move ship forward
        this.shipPosition.z -= this.moveSpeed * delta;

        if (this.enduranceGroup) {
            this.enduranceGroup.position.copy(this.shipPosition);
            this.enduranceGroup.rotation.z -= delta * 0.5; // Constant spin

            // Camera follows ship but allows rotation
            const deltaMove = new THREE.Vector3().subVectors(this.shipPosition, this.prevShipPosition);
            this.camera.position.add(deltaMove);
            this.controls.target.copy(this.shipPosition);

            this.prevShipPosition.copy(this.shipPosition);
        }

        // Stars infinite loop
        if (this.stars) {
            const positions = this.stars.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i += 3) {
                // If star is behind camera (z > camera.z) by some margin, reset it far ahead
                if (positions[i + 2] > this.camera.position.z + 10) {
                    positions[i + 2] -= 2000; // Loop back to far distance
                }
            }
            this.stars.geometry.attributes.position.needsUpdate = true;
        }

        // Keep wormhole far ahead always? 
        // No, we want to approach it. so it stays at fixed world pos (-500).
        // But maybe reset it if we pass it, so the journey continues?
        if (this.wormhole) {
            if (this.shipPosition.z < this.wormhole.position.z) {
                // Passed the wormhole! Reset ship or move wormhole further?
                // Let's move wormhole away to infinite journey for now.
                this.wormhole.position.z -= 1000;
            }
        }
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
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

export default InterstellarApp;

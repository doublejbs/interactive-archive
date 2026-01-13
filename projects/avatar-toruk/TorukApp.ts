import * as THREE from 'three';

/**
 * Avatar Toruk Flight Simulation
 */
class TorukApp {
    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;

    private animationId: number | null;

    // Toruk
    private torukGroup: THREE.Group | null;
    private leftWing: THREE.Group | null;
    private rightWing: THREE.Group | null;

    // Environment
    private mountains: THREE.Group | null;

    // Flight State
    private mousePos: THREE.Vector2;
    private targetRotation: THREE.Vector2;
    private flightSpeed: number = 20.0;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.torukGroup = null;
        this.leftWing = null;
        this.rightWing = null;
        this.mountains = null;
        this.mousePos = new THREE.Vector2();
        this.targetRotation = new THREE.Vector2();

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, -10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        this.setupScene();
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): TorukApp {
        return new TorukApp(container);
    }

    private setupScene(): void {
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Toruk Model
        this.createToruk();

        // Environment
        this.createMountains();
    }

    private createToruk(): void {
        this.torukGroup = new THREE.Group();

        // Materials
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff4500, flatShading: true }); // Orange-Red
        const secondaryMat = new THREE.MeshPhongMaterial({ color: 0xffd700, flatShading: true }); // Gold
        const wingMat = new THREE.MeshPhongMaterial({ color: 0xff6347, side: THREE.DoubleSide, flatShading: true });

        // Body (Capsule-ish)
        const bodyGeo = new THREE.CapsuleGeometry(1, 4, 4, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        body.castShadow = true;
        this.torukGroup.add(body);

        // Head
        const headGeo = new THREE.ConeGeometry(0.8, 2, 8);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.rotation.x = -Math.PI / 2;
        head.position.z = -3;
        body.add(head); // Attach to body logic if we want rigid body, but group is easier

        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.2, 0.6, 3, 8);
        const tail = new THREE.Mesh(tailGeo, secondaryMat);
        tail.rotation.x = Math.PI / 2;
        tail.position.z = 3.5;
        this.torukGroup.add(tail);

        // Wings Setup
        this.leftWing = new THREE.Group();
        this.rightWing = new THREE.Group();

        const wingShape = new THREE.BufferGeometry();
        // Simple wing shape (triangle-ish)
        const wingVertices = new Float32Array([
            0, 0, 0,
            8, 0, 2,  // Tip back
            8, 0, -2, // Tip front
            4, 0, 1,
            2, 0, -1
        ]);
        // Use a simple box for now for volume
        const wingGeo = new THREE.BoxGeometry(8, 0.2, 4);
        wingGeo.translate(4, 0, 0); // Pivot at 0

        const lWingMesh = new THREE.Mesh(wingGeo, wingMat);
        const rWingMesh = new THREE.Mesh(wingGeo, wingMat);

        this.leftWing.add(lWingMesh);
        this.rightWing.add(rWingMesh);

        // Position Wings
        this.leftWing.position.set(0.5, 0, 0);
        this.rightWing.position.set(-0.5, 0, 0);
        this.rightWing.rotation.y = Math.PI; // Mirror

        this.torukGroup.add(this.leftWing);
        this.torukGroup.add(this.rightWing);

        // Rider (Jake Sully) 
        const riderGroup = new THREE.Group();
        riderGroup.position.set(0, 1.0, -0.2); // Sit on back

        const skinMat = new THREE.MeshLambertMaterial({ color: 0x0088ff }); // Navi Blue
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.2), skinMat);
        torso.position.y = 0.3;
        riderGroup.add(torso);

        // Head
        const naviHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), skinMat);
        naviHead.position.y = 0.75;
        riderGroup.add(naviHead);

        // Hair (Queue)
        const queue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), hairMat);
        queue.position.set(0, 0.7, 0.15);
        queue.rotation.x = -Math.PI / 4;
        riderGroup.add(queue);

        // Legs (Sitting)
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), skinMat);
        lLeg.position.set(0.2, 0.1, 0.1);
        lLeg.rotation.x = -Math.PI / 2; // Legs forward/down
        lLeg.rotation.z = -Math.PI / 6; // Splayed
        riderGroup.add(lLeg);

        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), skinMat);
        rLeg.position.set(-0.2, 0.1, 0.1);
        rLeg.rotation.x = -Math.PI / 2;
        rLeg.rotation.z = Math.PI / 6;
        riderGroup.add(rLeg);

        // Arms (Holding on)
        const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), skinMat);
        lArm.position.set(0.25, 0.4, 0.1);
        lArm.rotation.x = -Math.PI / 3;
        riderGroup.add(lArm);

        const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), skinMat);
        rArm.position.set(-0.25, 0.4, 0.1);
        rArm.rotation.x = -Math.PI / 3;
        riderGroup.add(rArm);

        this.torukGroup.add(riderGroup);

        this.scene.add(this.torukGroup);
    }

    private createMountains(): void {
        this.mountains = new THREE.Group();

        const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, flatShading: true });
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x228b22, flatShading: true });

        for (let i = 0; i < 50; i++) {
            const mountain = new THREE.Group();

            // Random position
            const x = (Math.random() - 0.5) * 400;
            const y = (Math.random() - 0.5) * 100 + 20; // Keep slightly above
            const z = -Math.random() * 500 - 50; // In front

            mountain.position.set(x, y, z);

            // Rock base
            const size = Math.random() * 10 + 5;
            const geo = new THREE.DodecahedronGeometry(size);
            const mesh = new THREE.Mesh(geo, rockMat);
            mountain.add(mesh);

            // Grass top
            const grassGeo = new THREE.CylinderGeometry(size * 0.8, size, 2, 6);
            const grass = new THREE.Mesh(grassGeo, grassMat);
            grass.position.y = size * 0.8;
            mountain.add(grass);

            this.mountains.add(mountain);
        }

        this.scene.add(this.mountains);
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    private handleMouseMove(event: MouseEvent): void {
        // Normalize mouse -1 to 1
        this.mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    private handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private update(time: number, delta: number): void {
        if (!this.torukGroup) return;

        // --- Flight Mechanics ---
        // Smoothly rotate towards mouse direction (Pitch & Yaw)
        // Bank (Roll) when turning

        const targetPitch = this.mousePos.y * 1.0;
        const targetYaw = -this.mousePos.x * 1.0;

        // Interpolate rotation
        this.torukGroup.rotation.x += (targetPitch - this.torukGroup.rotation.x) * delta * 2.0;
        this.torukGroup.rotation.y += (targetYaw - this.torukGroup.rotation.y) * delta * 2.0;

        // Banking effect (Roll based on Yaw turn speed/amount)
        const bankAngle = -this.mousePos.x * 0.8;
        this.torukGroup.rotation.z += (bankAngle - this.torukGroup.rotation.z) * delta * 3.0;

        // --- Wing Animation ---
        if (this.leftWing && this.rightWing) {
            const flapSpeed = 8.0;
            const flapAmp = 0.5;
            const angle = Math.sin(time * flapSpeed) * flapAmp;

            this.leftWing.rotation.z = angle;
            this.rightWing.rotation.z = -angle; // Mirror
        }

        // --- Environment Movement (Simulate forward flight) ---
        if (this.mountains) {
            this.mountains.children.forEach(mtn => {
                mtn.position.z += this.flightSpeed * delta;

                // Recycle mountains
                if (mtn.position.z > 50) {
                    mtn.position.z = -500;
                    mtn.position.x = (Math.random() - 0.5) * 400;
                    mtn.position.y = (Math.random() - 0.5) * 100 + 20;
                }
            });
        }

        // Camera Follow (Flexible "Chase Cam")
        const relativeOffset = new THREE.Vector3(0, 3, 8);
        const cameraTargetPos = relativeOffset.applyMatrix4(this.torukGroup.matrixWorld);

        // Smooth follow
        this.camera.position.lerp(cameraTargetPos, delta * 3.0);
        this.camera.lookAt(this.torukGroup.position);
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        this.update(time, delta);
        this.renderer.render(this.scene, this.camera);
    }

    public start(): void {
        this.animate();
    }

    public stop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

export default TorukApp;

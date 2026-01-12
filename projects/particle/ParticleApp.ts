import * as THREE from 'three';

/**
 * Particle 시스템 앱
 */
class ParticleApp {
    private static readonly PARTICLE_COUNT = 3000;
    private static readonly PARTICLE_SIZE = 0.08;
    private static readonly MOVE_SPEED = 150.0;
    private static readonly DAMPING = 0.95;

    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;
    private readonly textCanvas: HTMLCanvasElement;
    private readonly textContext: CanvasRenderingContext2D;
    
    private animationId: number | null;
    private particles: THREE.Points | null;
    private particleVelocities: THREE.Vector3[];
    private particleTargets: THREE.Vector3[];
    private geometry: THREE.BufferGeometry | null;
    private textInput: HTMLInputElement | null;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.particles = null;
        this.particleVelocities = [];
        this.particleTargets = [];
        this.geometry = null;
        this.textInput = null;

        // 텍스트 렌더링용 캔버스 생성
        this.textCanvas = document.createElement('canvas');
        this.textCanvas.width = 512;
        this.textCanvas.height = 256;
        const ctx = this.textCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas context를 가져올 수 없습니다.');
        }
        this.textContext = ctx;

        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        // 렌더러 생성
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // 초기화
        this.setupScene();
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): ParticleApp {
        return new ParticleApp(container);
    }

    /**
     * 씬 초기 설정
     */
    private setupScene(): void {
        // 파티클 지오메트리 생성
        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(ParticleApp.PARTICLE_COUNT * 3);

        // 파티클 초기 위치 및 속도, 타겟 설정
        for (let i = 0; i < ParticleApp.PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            
            // 랜덤 위치 (-8 ~ 8 범위)
            positions[i3] = (Math.random() - 0.5) * 16;
            positions[i3 + 1] = (Math.random() - 0.5) * 16;
            positions[i3 + 2] = (Math.random() - 0.5) * 3;

            // 초기 속도와 타겟
            this.particleVelocities.push(new THREE.Vector3(0, 0, 0));
            this.particleTargets.push(new THREE.Vector3(
                positions[i3],
                positions[i3 + 1],
                positions[i3 + 2]
            ));
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // 파티클 머티리얼 생성
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: ParticleApp.PARTICLE_SIZE,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        // 파티클 시스템 생성
        this.particles = new THREE.Points(this.geometry, material);
        this.scene.add(this.particles);

        // 초기 텍스트 설정
        this.updateTextShape('HELLO');
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 텍스트 입력 이벤트
        this.textInput = document.getElementById('text-input') as HTMLInputElement;
        if (this.textInput) {
            this.textInput.addEventListener('input', this.handleTextInput.bind(this));
        }
    }

    /**
     * 텍스트 입력 핸들러
     */
    private handleTextInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const text = input.value.trim().toUpperCase();
        
        if (text) {
            this.updateTextShape(text);
        }
    }

    /**
     * 텍스트를 파티클 형태로 변환
     */
    private updateTextShape(text: string): void {
        // 캔버스 초기화
        this.textContext.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
        
        // 텍스트 스타일 설정
        this.textContext.fillStyle = '#ffffff';
        this.textContext.font = 'bold 120px Arial';
        this.textContext.textAlign = 'center';
        this.textContext.textBaseline = 'middle';
        
        // 텍스트 렌더링
        this.textContext.fillText(
            text,
            this.textCanvas.width / 2,
            this.textCanvas.height / 2
        );
        
        // 이미지 데이터 추출
        const imageData = this.textContext.getImageData(
            0,
            0,
            this.textCanvas.width,
            this.textCanvas.height
        );
        
        // 텍스트가 그려진 픽셀 위치 수집
        const textPixels: { x: number; y: number }[] = [];
        const sampling = 3; // 샘플링 간격 (성능 최적화)
        
        for (let y = 0; y < this.textCanvas.height; y += sampling) {
            for (let x = 0; x < this.textCanvas.width; x += sampling) {
                const index = (y * this.textCanvas.width + x) * 4;
                const alpha = imageData.data[index + 3];
                
                if (alpha > 128) {
                    textPixels.push({ x, y });
                }
            }
        }
        
        // 파티클 타겟 위치 업데이트
        for (let i = 0; i < ParticleApp.PARTICLE_COUNT; i++) {
            if (textPixels.length > 0) {
                // 랜덤하게 텍스트 픽셀 선택
                const pixel = textPixels[Math.floor(Math.random() * textPixels.length)];
                
                // 픽셀 좌표를 3D 좌표로 변환 (-4 ~ 4 범위로 정규화)
                const x = ((pixel.x / this.textCanvas.width) - 0.5) * 8;
                const y = -((pixel.y / this.textCanvas.height) - 0.5) * 4;
                const z = (Math.random() - 0.5) * 0.5;
                
                this.particleTargets[i].set(x, y, z);
            } else {
                // 텍스트가 없으면 랜덤 위치
                this.particleTargets[i].set(
                    (Math.random() - 0.5) * 16,
                    (Math.random() - 0.5) * 16,
                    (Math.random() - 0.5) * 3
                );
            }
        }
    }

    /**
     * 리사이즈 핸들러
     */
    private handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    /**
     * 업데이트
     */
    private update(delta: number): void {
        if (!this.particles || !this.geometry) return;

        const positions = this.geometry.attributes.position.array as Float32Array;

        // 각 파티클 업데이트
        for (let i = 0; i < ParticleApp.PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            
            // 현재 파티클 위치
            const particlePos = new THREE.Vector3(
                positions[i3],
                positions[i3 + 1],
                positions[i3 + 2]
            );

            // 타겟 위치를 향한 방향
            const direction = new THREE.Vector3()
                .subVectors(this.particleTargets[i], particlePos);
            
            const distance = direction.length();

            // 타겟에 가까우면 느리게, 멀면 빠르게
            const force = direction.normalize().multiplyScalar(
                Math.min(distance * ParticleApp.MOVE_SPEED, 10) * delta
            );

            // 속도 업데이트
            this.particleVelocities[i].add(force);
            this.particleVelocities[i].multiplyScalar(ParticleApp.DAMPING);

            // 위치 업데이트
            positions[i3] += this.particleVelocities[i].x * delta;
            positions[i3 + 1] += this.particleVelocities[i].y * delta;
            positions[i3 + 2] += this.particleVelocities[i].z * delta;
        }

        // 버퍼 업데이트
        this.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * 애니메이션 루프
     */
    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
        this.update(delta);

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 앱 시작
     */
    public start(): void {
        this.animate();
    }

    /**
     * 앱 정지
     */
    public stop(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * 리소스 정리
     */
    public dispose(): void {
        this.stop();
        
        if (this.geometry) {
            this.geometry.dispose();
        }

        this.scene.traverse((object) => {
            if (object instanceof THREE.Points) {
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        if (this.textInput) {
            this.textInput.removeEventListener('input', this.handleTextInput.bind(this));
        }
    }
}

export default ParticleApp;


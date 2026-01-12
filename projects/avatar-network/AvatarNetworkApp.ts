import * as THREE from 'three';

interface Branch {
    start: THREE.Vector3;
    end: THREE.Vector3;
    direction: THREE.Vector3;
    age: number;
    generation: number;
    isGrowing: boolean;
    length: number;
    targetLength: number;
    color: THREE.Color;
}

/**
 * Avatar Network 앱 - 네온 나무 뿌리 네트워크
 */
class AvatarNetworkApp {
    private static readonly MAX_BRANCHES = 3000;
    private static readonly BRANCH_LENGTH = 6.0;
    private static readonly GROWTH_SPEED = 12.0;
    private static readonly BRANCH_ANGLE = Math.PI / 2;
    private static readonly BRANCH_PROBABILITY = 0.95;
    private static readonly TUBE_RADIUS = 0.12;

    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;
    
    private animationId: number | null;
    private branches: Branch[];
    private branchLines: THREE.Group;
    private elapsedTime: number;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.branches = [];
        this.branchLines = new THREE.Group();
        this.elapsedTime = 0;

        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(
            120,
            container.clientWidth / container.clientHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 0, 20);

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

    public static create(container: HTMLElement): AvatarNetworkApp {
        return new AvatarNetworkApp(container);
    }

    /**
     * 씬 초기 설정
     */
    private setupScene(): void {
        this.scene.add(this.branchLines);

        // 여러 시작점 생성
        const startPoints: THREE.Vector3[] = [
            new THREE.Vector3(0, 0, 0),           // 중심
            new THREE.Vector3(-15, 10, 0),        // 왼쪽 위
            new THREE.Vector3(15, 10, 0),         // 오른쪽 위
            new THREE.Vector3(-15, -10, 0),       // 왼쪽 아래
            new THREE.Vector3(15, -10, 0),        // 오른쪽 아래
            new THREE.Vector3(0, 15, 0),          // 위
            new THREE.Vector3(0, -15, 0),         // 아래
            new THREE.Vector3(-20, 0, 0),         // 왼쪽
            new THREE.Vector3(20, 0, 0),          // 오른쪽
        ];

        // 각 시작점에서 여러 방향으로 가지 생성
        startPoints.forEach(startPoint => {
            const numBranchesPerPoint = 4 + Math.floor(Math.random() * 4); // 4-7개
            
            for (let i = 0; i < numBranchesPerPoint; i++) {
                const angle = (i / numBranchesPerPoint) * Math.PI * 2 + (Math.random() * 0.5);
                const direction = new THREE.Vector3(
                    Math.cos(angle),
                    Math.sin(angle),
                    0
                ).normalize();

                this.createBranch(startPoint, direction, 0);
            }
        });

        // 여러 조명 추가
        startPoints.forEach(point => {
            const pointLight = new THREE.PointLight(0x00ffff, 0.5, 50);
            pointLight.position.copy(point);
            this.scene.add(pointLight);
        });
    }

    /**
     * 새로운 가지 생성
     */
    private createBranch(
        start: THREE.Vector3,
        direction: THREE.Vector3,
        generation: number
    ): void {
        if (this.branches.length >= AvatarNetworkApp.MAX_BRANCHES) return;

        // 세대별 색상 (네온 청록색 -> 네온 파란색 -> 네온 보라색)
        const hue = 0.5 + (generation * 0.05) % 0.3; // 청록 -> 파란 -> 보라
        const color = new THREE.Color().setHSL(hue, 1.0, 0.5);

        const targetLength = AvatarNetworkApp.BRANCH_LENGTH * (1 - generation * 0.05);

        const branch: Branch = {
            start: start.clone(),
            end: start.clone(),
            direction: direction.normalize(),
            age: 0,
            generation: generation,
            isGrowing: true,
            length: 0,
            targetLength: Math.max(targetLength, 0.5),
            color: color,
        };

        this.branches.push(branch);

        // 초기 짧은 튜브 생성 (성장하면서 업데이트)
        const points = [start.clone(), start.clone().add(direction.clone().multiplyScalar(0.01))];
        const curve = new THREE.CatmullRomCurve3(points);
        
        const tubeGeometry = new THREE.TubeGeometry(
            curve,
            2,
            AvatarNetworkApp.TUBE_RADIUS,
            8,
            false
        );

        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });

        const mesh = new THREE.Mesh(tubeGeometry, material);
        this.branchLines.add(mesh);
    }

    /**
     * 가지 분기
     */
    private branchOut(branch: Branch): void {
        if (branch.generation >= 25) return; // 최대 세대 제한 대폭 증가
        if (Math.random() > AvatarNetworkApp.BRANCH_PROBABILITY) return;

        // 2-5개의 새로운 가지 생성
        const numNewBranches = 2 + Math.floor(Math.random() * 4);

        for (let i = 0; i < numNewBranches; i++) {
            // 원래 방향에서 큰 각도로 꺾어서 새 방향 생성 (Z축 기준으로만 회전)
            // -90도 ~ +90도 범위로 크게 꺾임
            const angleRange = AvatarNetworkApp.BRANCH_ANGLE;
            const angle = (Math.random() - 0.5) * angleRange * 2;
            const zAxis = new THREE.Vector3(0, 0, 1);

            const newDirection = branch.direction.clone()
                .applyAxisAngle(zAxis, angle);
            
            // Z값을 0으로 고정하여 완전한 2D 평면 유지
            newDirection.z = 0;
            newDirection.normalize();

            this.createBranch(
                branch.end.clone(),
                newDirection,
                branch.generation + 1
            );
        }
    }

    /**
     * 가지 성장 업데이트
     */
    private updateBranches(delta: number): void {
        this.branches.forEach((branch, index) => {
            if (branch.isGrowing) {
                // 가지 성장
                branch.length += AvatarNetworkApp.GROWTH_SPEED * delta;

                if (branch.length >= branch.targetLength) {
                    branch.length = branch.targetLength;
                    branch.isGrowing = false;

                    // 성장 완료 시 분기
                    this.branchOut(branch);
                }

                // end 위치 업데이트
                branch.end = branch.start.clone()
                    .add(branch.direction.clone().multiplyScalar(branch.length));

                // 튜브 지오메트리 재생성
                const mesh = this.branchLines.children[index] as THREE.Mesh;
                if (mesh && mesh.geometry) {
                    mesh.geometry.dispose();
                    
                    const points = [branch.start.clone(), branch.end.clone()];
                    const curve = new THREE.CatmullRomCurve3(points);
                    
                    const segments = Math.max(2, Math.floor(branch.length * 4));
                    const newGeometry = new THREE.TubeGeometry(
                        curve,
                        segments,
                        AvatarNetworkApp.TUBE_RADIUS * (1 - branch.generation * 0.06),
                        8,
                        false
                    );
                    
                    mesh.geometry = newGeometry;
                }
            }

            // 나이 증가
            branch.age += delta;

            // 펄스 효과 (네온 깜빡임)
            const mesh = this.branchLines.children[index] as THREE.Mesh;
            if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
                const pulse = 0.7 + Math.sin(this.elapsedTime * 3 + branch.age) * 0.3;
                mesh.material.opacity = pulse;
            }
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));
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
        this.elapsedTime += delta;

        // 가지 업데이트
        this.updateBranches(delta);

        // 카메라 고정 (정면에서 관찰)
        this.camera.position.set(0, 0, 20);
        this.camera.lookAt(0, 0, 0);
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
        
        this.branchLines.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (object.material instanceof THREE.Material) {
                    object.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}

export default AvatarNetworkApp;


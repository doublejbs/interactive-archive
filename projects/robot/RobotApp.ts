import * as THREE from 'three';

/**
 * Robot 앱 - 방향키로 조종하는 3D 로봇
 */
class RobotApp {
    private static readonly MOVE_SPEED = 5.0;
    private static readonly ROTATION_SPEED = 2.0;
    private static readonly CAMERA_DISTANCE = 10;
    private static readonly CAMERA_HEIGHT = 5;

    private readonly container: HTMLElement;
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;
    
    private animationId: number | null;
    private robot: THREE.Group;
    private robotRotation: number;
    private robotPosition: THREE.Vector3;
    private keys: { [key: string]: boolean };
    private leftLeg: THREE.Mesh;
    private rightLeg: THREE.Mesh;
    private leftArm: THREE.Mesh;
    private rightArm: THREE.Mesh;
    private walkCycle: number;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.robot = new THREE.Group();
        this.robotRotation = 0;
        this.robotPosition = new THREE.Vector3(0, 0, 0);
        this.keys = {};
        this.walkCycle = 0;
        
        // 임시로 초기화 (나중에 createRobot에서 설정됨)
        this.leftLeg = new THREE.Mesh();
        this.rightLeg = new THREE.Mesh();
        this.leftArm = new THREE.Mesh();
        this.rightArm = new THREE.Mesh();

        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 50);

        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        
        // 렌더러 생성
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // 초기화
        this.setupScene();
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): RobotApp {
        return new RobotApp(container);
    }

    /**
     * 씬 초기 설정
     */
    private setupScene(): void {
        // 조명 설정
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);

        // 바닥 생성
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d2d44,
            roughness: 0.8,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 그리드 헬퍼
        const gridHelper = new THREE.GridHelper(100, 50, 0x444466, 0x333344);
        this.scene.add(gridHelper);

        // 로봇 생성
        this.createRobot();
        this.scene.add(this.robot);

        // 카메라 고정 위치 설정 (위에서 내려다보는 시점)
        this.camera.position.set(0, 20, 15);
        this.updateCamera();
    }

    /**
     * 로봇 생성 - 테슬라 옵티머스 스타일
     */
    private createRobot(): void {
        const whiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            metalness: 0.6,
            roughness: 0.3,
        });

        const darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.8,
            roughness: 0.2,
        });

        // 머리 (구형 + 목)
        const headGeometry = new THREE.SphereGeometry(0.45, 32, 32);
        const head = new THREE.Mesh(headGeometry, whiteMaterial);
        head.position.y = 3.7;
        head.castShadow = true;
        this.robot.add(head);

        // 얼굴 마스크 (어두운 부분)
        const faceGeometry = new THREE.SphereGeometry(0.42, 32, 32, 0, Math.PI);
        const face = new THREE.Mesh(faceGeometry, darkMaterial);
        face.position.set(0, 3.7, 0.15);
        face.rotation.y = Math.PI;
        face.castShadow = true;
        this.robot.add(face);

        // 눈 (두 개의 작은 발광 구)
        const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ccff,
            emissive: 0x00ccff,
            emissiveIntensity: 1.0,
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 3.75, 0.38);
        this.robot.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
        rightEye.position.set(0.15, 3.75, 0.38);
        this.robot.add(rightEye);

        // 목
        const neckGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
        const neck = new THREE.Mesh(neckGeometry, darkMaterial);
        neck.position.y = 3.15;
        neck.castShadow = true;
        this.robot.add(neck);

        // 상체 (둥근 직육면체)
        const torsoGeometry = new THREE.BoxGeometry(1.0, 1.3, 0.5);
        const torso = new THREE.Mesh(torsoGeometry, whiteMaterial);
        torso.position.y = 2.3;
        torso.castShadow = true;
        this.robot.add(torso);

        // 가슴 중앙 패널
        const chestGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.52);
        const chest = new THREE.Mesh(chestGeometry, darkMaterial);
        chest.position.set(0, 2.4, 0);
        chest.castShadow = true;
        this.robot.add(chest);

        // 허리
        const waistGeometry = new THREE.CylinderGeometry(0.35, 0.4, 0.4, 16);
        const waist = new THREE.Mesh(waistGeometry, darkMaterial);
        waist.position.y = 1.5;
        waist.castShadow = true;
        this.robot.add(waist);

        // 어깨 (둥근 조인트)
        const shoulderGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        
        const leftShoulder = new THREE.Mesh(shoulderGeometry, darkMaterial);
        leftShoulder.position.set(-0.7, 2.8, 0);
        leftShoulder.castShadow = true;
        this.robot.add(leftShoulder);

        const rightShoulder = new THREE.Mesh(shoulderGeometry, darkMaterial.clone());
        rightShoulder.position.set(0.7, 2.8, 0);
        rightShoulder.castShadow = true;
        this.robot.add(rightShoulder);

        // 팔 (상완 + 하완)
        // 왼쪽 상완
        const upperArmGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 16);
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, whiteMaterial);
        leftUpperArm.position.set(-0.7, 2.3, 0);
        leftUpperArm.castShadow = true;
        this.robot.add(leftUpperArm);

        // 왼쪽 팔꿈치
        const elbowGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const leftElbow = new THREE.Mesh(elbowGeometry, darkMaterial);
        leftElbow.position.set(-0.7, 1.9, 0);
        this.robot.add(leftElbow);

        // 왼쪽 하완 (애니메이션용)
        const lowerArmGeometry = new THREE.CylinderGeometry(0.1, 0.09, 0.7, 16);
        this.leftArm = new THREE.Mesh(lowerArmGeometry, whiteMaterial);
        this.leftArm.position.set(-0.7, 1.5, 0);
        this.leftArm.castShadow = true;
        this.robot.add(this.leftArm);

        // 오른쪽 팔 (대칭)
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, whiteMaterial.clone());
        rightUpperArm.position.set(0.7, 2.3, 0);
        rightUpperArm.castShadow = true;
        this.robot.add(rightUpperArm);

        const rightElbow = new THREE.Mesh(elbowGeometry, darkMaterial.clone());
        rightElbow.position.set(0.7, 1.9, 0);
        this.robot.add(rightElbow);

        this.rightArm = new THREE.Mesh(lowerArmGeometry, whiteMaterial.clone());
        this.rightArm.position.set(0.7, 1.5, 0);
        this.rightArm.castShadow = true;
        this.robot.add(this.rightArm);

        // 다리 (허벅지 + 무릎 + 종아리)
        // 왼쪽 허벅지
        const thighGeometry = new THREE.CylinderGeometry(0.15, 0.13, 0.8, 16);
        const leftThigh = new THREE.Mesh(thighGeometry, whiteMaterial);
        leftThigh.position.set(-0.25, 0.9, 0);
        leftThigh.castShadow = true;
        this.robot.add(leftThigh);

        // 왼쪽 무릎
        const kneeGeometry = new THREE.SphereGeometry(0.14, 16, 16);
        const leftKnee = new THREE.Mesh(kneeGeometry, darkMaterial);
        leftKnee.position.set(-0.25, 0.5, 0);
        this.robot.add(leftKnee);

        // 왼쪽 종아리 (애니메이션용)
        const calfGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.7, 16);
        this.leftLeg = new THREE.Mesh(calfGeometry, whiteMaterial);
        this.leftLeg.position.set(-0.25, 0.15, 0);
        this.leftLeg.castShadow = true;
        this.robot.add(this.leftLeg);

        // 왼쪽 발
        const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.35);
        const leftFoot = new THREE.Mesh(footGeometry, darkMaterial);
        leftFoot.position.set(-0.25, -0.15, 0.05);
        leftFoot.castShadow = true;
        this.robot.add(leftFoot);

        // 오른쪽 다리 (대칭)
        const rightThigh = new THREE.Mesh(thighGeometry, whiteMaterial.clone());
        rightThigh.position.set(0.25, 0.9, 0);
        rightThigh.castShadow = true;
        this.robot.add(rightThigh);

        const rightKnee = new THREE.Mesh(kneeGeometry, darkMaterial.clone());
        rightKnee.position.set(0.25, 0.5, 0);
        this.robot.add(rightKnee);

        this.rightLeg = new THREE.Mesh(calfGeometry, whiteMaterial.clone());
        this.rightLeg.position.set(0.25, 0.15, 0);
        this.rightLeg.castShadow = true;
        this.robot.add(this.rightLeg);

        const rightFoot = new THREE.Mesh(footGeometry, darkMaterial.clone());
        rightFoot.position.set(0.25, -0.15, 0.05);
        rightFoot.castShadow = true;
        this.robot.add(rightFoot);
    }

    /**
     * 카메라 업데이트 (고정된 위치에서 로봇을 바라봄)
     */
    private updateCamera(): void {
        // 카메라는 고정된 위치에서 로봇을 바라봄
        this.camera.lookAt(this.robotPosition.x, this.robotPosition.y + 2, this.robotPosition.z);
    }

    /**
     * 걷기 애니메이션
     */
    private animateWalk(delta: number, isMoving: boolean): void {
        if (isMoving) {
            this.walkCycle += delta * 8;

            // 다리 스윙
            const legSwing = Math.sin(this.walkCycle) * 0.3;
            this.leftLeg.rotation.x = legSwing;
            this.rightLeg.rotation.x = -legSwing;

            // 팔 스윙 (다리와 반대)
            this.leftArm.rotation.x = -legSwing;
            this.rightArm.rotation.x = legSwing;
        } else {
            // 정지 시 원래 위치로 복귀
            this.leftLeg.rotation.x *= 0.9;
            this.rightLeg.rotation.x *= 0.9;
            this.leftArm.rotation.x *= 0.9;
            this.rightArm.rotation.x *= 0.9;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    /**
     * 키 다운 핸들러
     */
    private handleKeyDown(event: KeyboardEvent): void {
        this.keys[event.key] = true;
    }

    /**
     * 키 업 핸들러
     */
    private handleKeyUp(event: KeyboardEvent): void {
        this.keys[event.key] = false;
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
        let isMoving = false;
        let targetRotation = this.robotRotation;
        let moveDirection = new THREE.Vector2(0, 0);

        // 방향키 입력 처리 - 4방향 이동
        if (this.keys['ArrowUp']) {
            // 위로 이동 (z축 음수 방향)
            moveDirection.y = -1;
            targetRotation = 0;
            isMoving = true;
        }
        
        if (this.keys['ArrowDown']) {
            // 아래로 이동 (z축 양수 방향)
            moveDirection.y = 1;
            targetRotation = Math.PI;
            isMoving = true;
        }
        
        if (this.keys['ArrowLeft']) {
            // 왼쪽으로 이동 (x축 음수 방향)
            moveDirection.x = -1;
            targetRotation = Math.PI / 2;
            isMoving = true;
        }
        
        if (this.keys['ArrowRight']) {
            // 오른쪽으로 이동 (x축 양수 방향)
            moveDirection.x = 1;
            targetRotation = -Math.PI / 2;
            isMoving = true;
        }

        // 대각선 이동 처리
        if (this.keys['ArrowUp'] && this.keys['ArrowLeft']) {
            targetRotation = Math.PI / 4;
        } else if (this.keys['ArrowUp'] && this.keys['ArrowRight']) {
            targetRotation = -Math.PI / 4;
        } else if (this.keys['ArrowDown'] && this.keys['ArrowLeft']) {
            targetRotation = Math.PI * 3 / 4;
        } else if (this.keys['ArrowDown'] && this.keys['ArrowRight']) {
            targetRotation = -Math.PI * 3 / 4;
        }

        // 이동 처리
        if (isMoving) {
            moveDirection.normalize();
            this.robotPosition.x += moveDirection.x * RobotApp.MOVE_SPEED * delta;
            this.robotPosition.z += moveDirection.y * RobotApp.MOVE_SPEED * delta;

            // 부드러운 회전
            let rotationDiff = targetRotation - this.robotRotation;
            
            // 회전 각도 정규화 (-PI ~ PI)
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
            
            this.robotRotation += rotationDiff * RobotApp.ROTATION_SPEED * delta;
        }

        // 로봇 위치 및 회전 업데이트
        this.robot.position.copy(this.robotPosition);
        this.robot.rotation.y = this.robotRotation;

        // 걷기 애니메이션
        this.animateWalk(delta, isMoving);

        // 카메라 업데이트
        this.updateCamera();
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
        
        this.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    }
}

export default RobotApp;


import * as THREE from 'three';

/**
 * Three.js 씬 관리 클래스
 */
class SceneManager {
    private readonly scene: THREE.Scene;
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly clock: THREE.Clock;
    private readonly container: HTMLElement;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.clock = new THREE.Clock();

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

        // 초기 씬 설정
        this.setupScene();
    }

    public static create(container: HTMLElement): SceneManager {
        return new SceneManager(container);
    }

    /**
     * 초기 씬 설정
     */
    private setupScene(): void {
        // 조명 추가
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // 테스트용 큐브 추가
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            metalness: 0.5,
            roughness: 0.5,
        });
        const cube = new THREE.Mesh(geometry, material);
        this.scene.add(cube);
    }

    /**
     * 업데이트
     */
    public update(delta: number): void {
        // 씬 내 오브젝트 업데이트 로직
        this.scene.children.forEach((child) => {
            if (child instanceof THREE.Mesh) {
                child.rotation.x += delta * 0.5;
                child.rotation.y += delta * 0.5;
            }
        });
    }

    /**
     * 렌더링
     */
    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 리사이즈 처리
     */
    public handleResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    /**
     * 씬 반환
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * 카메라 반환
     */
    public getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }

    /**
     * 렌더러 반환
     */
    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    /**
     * 클럭 반환
     */
    public getClock(): THREE.Clock {
        return this.clock;
    }

    /**
     * 리소스 정리
     */
    public dispose(): void {
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
    }
}

export default SceneManager;


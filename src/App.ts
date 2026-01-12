import * as THREE from 'three';
import SceneManager from './core/SceneManager';
import InteractionManager from './core/InteractionManager';

/**
 * 메인 앱 클래스
 */
class App {
    private readonly container: HTMLElement;
    private readonly sceneManager: SceneManager;
    private readonly interactionManager: InteractionManager;
    private animationId: number | null;

    private constructor(container: HTMLElement) {
        this.container = container;
        this.animationId = null;

        // 씬 매니저 초기화
        this.sceneManager = SceneManager.create(container);

        // 인터랙션 매니저 초기화
        this.interactionManager = InteractionManager.create(
            this.container,
            this.sceneManager.getCamera()
        );

        // 이벤트 리스너 등록
        this.setupEventListeners();
    }

    public static create(container: HTMLElement): App {
        return new App(container);
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
        this.sceneManager.handleResize();
    }

    /**
     * 애니메이션 루프
     */
    private animate(): void {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        // 업데이트
        const delta = this.sceneManager.getClock().getDelta();
        this.sceneManager.update(delta);

        // 렌더링
        this.sceneManager.render();
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
        this.sceneManager.dispose();
        this.interactionManager.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}

export default App;


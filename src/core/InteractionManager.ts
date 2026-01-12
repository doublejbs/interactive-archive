import * as THREE from 'three';

/**
 * 마우스/터치 인터랙션 관리 클래스
 */
class InteractionManager {
    private readonly container: HTMLElement;
    private readonly camera: THREE.Camera;
    private readonly mouse: THREE.Vector2;
    private readonly raycaster: THREE.Raycaster;
    private isMouseDown: boolean;

    private constructor(container: HTMLElement, camera: THREE.Camera) {
        this.container = container;
        this.camera = camera;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.isMouseDown = false;

        this.setupEventListeners();
    }

    public static create(
        container: HTMLElement,
        camera: THREE.Camera
    ): InteractionManager {
        return new InteractionManager(container, camera);
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
        this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.container.addEventListener('click', this.handleClick.bind(this));

        // 터치 이벤트
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), {
            passive: false,
        });
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), {
            passive: false,
        });
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    /**
     * 마우스 좌표를 정규화된 디바이스 좌표로 변환
     */
    private updateMousePosition(clientX: number, clientY: number): void {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * 마우스 이동 핸들러
     */
    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event.clientX, event.clientY);

        // 커스텀 이벤트 발생
        this.container.dispatchEvent(
            new CustomEvent('interactionMove', {
                detail: { mouse: this.mouse, isMouseDown: this.isMouseDown },
            })
        );
    }

    /**
     * 마우스 다운 핸들러
     */
    private handleMouseDown(event: MouseEvent): void {
        this.isMouseDown = true;
        this.updateMousePosition(event.clientX, event.clientY);

        this.container.dispatchEvent(
            new CustomEvent('interactionStart', {
                detail: { mouse: this.mouse },
            })
        );
    }

    /**
     * 마우스 업 핸들러
     */
    private handleMouseUp(): void {
        this.isMouseDown = false;

        this.container.dispatchEvent(
            new CustomEvent('interactionEnd', {
                detail: { mouse: this.mouse },
            })
        );
    }

    /**
     * 클릭 핸들러
     */
    private handleClick(): void {
        this.container.dispatchEvent(
            new CustomEvent('interactionClick', {
                detail: { mouse: this.mouse },
            })
        );
    }

    /**
     * 터치 시작 핸들러
     */
    private handleTouchStart(event: TouchEvent): void {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.isMouseDown = true;
            this.updateMousePosition(touch.clientX, touch.clientY);

            this.container.dispatchEvent(
                new CustomEvent('interactionStart', {
                    detail: { mouse: this.mouse },
                })
            );
        }
    }

    /**
     * 터치 이동 핸들러
     */
    private handleTouchMove(event: TouchEvent): void {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.updateMousePosition(touch.clientX, touch.clientY);

            this.container.dispatchEvent(
                new CustomEvent('interactionMove', {
                    detail: { mouse: this.mouse, isMouseDown: this.isMouseDown },
                })
            );
        }
    }

    /**
     * 터치 종료 핸들러
     */
    private handleTouchEnd(): void {
        this.isMouseDown = false;

        this.container.dispatchEvent(
            new CustomEvent('interactionEnd', {
                detail: { mouse: this.mouse },
            })
        );
    }

    /**
     * Raycaster로 오브젝트 검출
     */
    public getIntersectedObjects(objects: THREE.Object3D[]): THREE.Intersection[] {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }

    /**
     * 현재 마우스 위치 반환
     */
    public getMousePosition(): THREE.Vector2 {
        return this.mouse.clone();
    }

    /**
     * 리소스 정리
     */
    public dispose(): void {
        this.container.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.container.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.container.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.container.removeEventListener('click', this.handleClick.bind(this));
        this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        this.container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }
}

export default InteractionManager;


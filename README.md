# Interactive Archive

Canvas와 Three.js를 활용한 인터랙션 아트 웹 페이지입니다.

## 프로젝트 구조

```
interactive-archive/
├── index.html              # 메인 HTML 파일
├── package.json            # 프로젝트 설정
├── tsconfig.json          # TypeScript 설정
└── src/
    ├── main.ts            # 진입점
    ├── App.ts             # 메인 앱 클래스
    └── core/
        ├── SceneManager.ts        # Three.js 씬 관리
        └── InteractionManager.ts  # 인터랙션 관리
```

## 기능

- **SceneManager**: Three.js 씬, 카메라, 렌더러 관리
- **InteractionManager**: 마우스/터치 인터랙션 처리
- 반응형 디자인 (자동 리사이즈)
- 애니메이션 루프
- 커스텀 이벤트 시스템

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 개발 가이드

### 새로운 3D 오브젝트 추가

`SceneManager.ts`의 `setupScene()` 메서드에서 Three.js 오브젝트를 추가할 수 있습니다.

### 인터랙션 이벤트 사용

컨테이너에서 발생하는 커스텀 이벤트:
- `interactionStart`: 마우스/터치 시작
- `interactionMove`: 마우스/터치 이동
- `interactionEnd`: 마우스/터치 종료
- `interactionClick`: 클릭

## 기술 스택

- TypeScript
- Three.js
- Vite

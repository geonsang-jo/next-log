# Yarn PnP Migration Design Spec

## Overview

`node_modules` 기반 의존성 관리를 Yarn Berry PnP (Plug'n'Play)로 전환한다.
Zero-Install 전략을 사용하여 `.yarn/cache`를 git에 포함시킨다.

## Goals

- **설치 속도 / CI 성능 개선** — node_modules 제거로 인한 설치 시간 단축
- **의존성 안정성** — phantom dependency 방지, 엄격한 의존성 관리 (Strict PnP)
- **디스크 절약** — node_modules 디렉토리 완전 제거

## Constraints

- Strict PnP 모드 사용 (loose 모드 사용하지 않음)
- Zero-Install 방식 (`.yarn/cache`를 git에 커밋)
- Vercel 배포 환경 호환 필수
- 기존 Next.js 14 + MDX 빌드 파이프라인 유지

## Current State

- Yarn 4.6.0 (Berry) 설치됨, `.yarnrc.yml` 없이 node_modules linker로 동작 중
- Node.js 20.11.1 (`.nvmrc`)
- Next.js 14 + MDX 블로그 프로젝트
- 의존성 약 50개 (dependencies + devDependencies)
- Vercel 배포 (`@vercel/analytics` 사용)

## Design

### 1. 미사용 패키지 정리

PnP 전환 전에 죽은 의존성 9개를 제거한다.

**Dependencies에서 삭제:**

| Package | Reason |
|---------|--------|
| `@types/remark-prism` | `remark-prism` 삭제에 따라 불필요 |
| `next-compose-plugins` | `next.config.js`에서 미사용 |
| `nextra` | import 없음 |
| `nextra-theme-blog` | import 없음 |
| `prismjs` | `rehype-prism-plus`로 대체됨 |
| `react-responsive` | import 없음 |
| `remark-html` | import 없음, `remark-rehype` + `rehype-stringify` 사용 |
| `remark-prism` | `rehype-prism-plus`로 대체됨 |
| `shiki` | import 없음, `rehype-prism-plus` 사용 |

**유지하는 패키지 (삭제 후보였으나 유지):**

| Package | Reason |
|---------|--------|
| `@mdx-js/loader` | `@next/mdx`의 peer dependency — Strict PnP에서 필수 |
| `@mdx-js/react` | `@next/mdx`의 peer dependency — Strict PnP에서 필수 |

### 2. 핵심 설정 변경

**`.yarnrc.yml` 생성:**

```yaml
nodeLinker: pnp
enableGlobalCache: false
```

- `nodeLinker: pnp` — PnP 모드 활성화
- `enableGlobalCache: false` — Zero-Install을 위해 프로젝트 로컬 cache 사용

**`.gitignore` 수정:**

기존:
```
/.pnp
.pnp.js
.pnp.cjs
.pnp.loader.mjs
.yarn/
```

변경:
```
# dependencies
/node_modules

# Yarn PnP (Zero-Install)
.yarn/*
!.yarn/cache
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
```

- `/node_modules` 라인은 안전망으로 유지 (실수로 `npm install` 실행 시 대비)
- `.pnp.cjs` 관련 ignore 라인을 삭제하여 git 추적 대상에 포함시킨다.

### 3. 비호환 패키지 대응

Strict PnP에서 빌드 실패가 발생할 경우, `.yarnrc.yml`에 `packageExtensions`를 추가하여 해결한다.

**대응 프로세스:**

1. `yarn build` 실행
2. 실패 시 에러 메시지에서 누락된 의존성 확인
3. `.yarnrc.yml`의 `packageExtensions`에 해당 의존성 추가
4. `yarn install` → `yarn build` 재실행
5. 3회 이상 반복 실패 시 해당 패키지 대체를 검토

```yaml
# packageExtensions 예시
packageExtensions:
  "some-package@*":
    dependencies:
      "missing-peer-dep": "*"
```

**폴백 기준:** `packageExtensions`로 해결 불가능한 패키지가 3개 이상 발견되면 Rollback Plan을 실행하고 마이그레이션을 재검토한다.

미사용 패키지 9개를 미리 정리하므로 비호환 위험이 크게 줄어든다.

### 4. IDE / TypeScript 지원

PnP에서는 node_modules가 없으므로 Yarn SDK를 설치하여 에디터가 타입을 찾도록 한다.

```bash
yarn dlx @yarnpkg/sdks vscode
```

- `.yarn/sdks/` 디렉토리 생성 (TypeScript, ESLint SDK)
- `.vscode/settings.json`에 TypeScript SDK 경로 자동 설정
- Zero-Install이므로 `.yarn/sdks/`도 git에 커밋

`tsconfig.json`은 `moduleResolution: "bundler"` 유지, 변경 불필요.

### 5. Vercel 배포

Vercel은 Yarn PnP + Zero-Install을 기본 지원한다.

- `yarn.lock` 감지 → Yarn 사용 자동 결정
- `.pnp.cjs` 존재 → PnP 모드 빌드
- Zero-Install → install 단계 스킵 또는 빠르게 완료
- `.nvmrc`(20.11.1) 자동 인식

Vercel 대시보드에서 별도 설정 변경 불필요.

## Migration Steps

1. **미사용 패키지 9개 삭제** — `package.json`에서 제거
2. **`.yarnrc.yml` 생성** — `nodeLinker: pnp`, `enableGlobalCache: false`
3. **`.gitignore` 수정** — Zero-Install 패턴으로 변경
4. **`node_modules` 삭제** + `yarn install` 실행
5. **`yarn dlx @yarnpkg/sdks vscode`** 실행 — IDE 지원
6. **`yarn build` 실행** — 실패 시 `packageExtensions`로 대응
7. **빌드 성공 확인** 후 커밋

## Rollback Plan

문제 발생 시 즉시 복귀 가능:

1. `.yarnrc.yml` 삭제
2. `.yarn/` 디렉토리 삭제
3. `.pnp.*` 파일 삭제 (`.pnp.cjs`, `.pnp.loader.mjs` 등)
4. `.gitignore` 원복
5. `yarn install` → node_modules 방식 복귀

## Out of Scope

- Yarn Workspaces 설정 (단일 패키지 프로젝트)
- `next.config.js`의 CJS → ESM 전환
- Node.js 버전 업그레이드
- 라이브러리화 작업 (향후 별도 프로젝트)

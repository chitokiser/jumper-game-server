# jumper-game-server

Jump 위치기반 게임의 실시간 게임 서버

> **Git 저장소**: https://github.com/chitokiser/jumper-game-server
> **배포**: Railway
> **메인 프로젝트(jumper_v10)와 Git 저장소 완전 분리**

---

## 저장소 구조

```
jumper_v10/              ← 메인 repo (Netlify 배포)
└── game-server/         ← 이 repo (Railway 배포)
    ├── src/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## 개발 규칙

```bash
# 게임 서버 수정 시 반드시 game-server 폴더에서 별도 push
cd jumper_v10/game-server
git add .
git commit -m "..."
git push origin main
```

## 실행

```bash
npm install
cp .env.example .env
npm run dev     # 개발
npm run build   # 빌드
npm start       # 프로덕션
```

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 (Railway 자동 주입) | `3000` |
| `NODE_ENV` | 환경 구분 | `development` |
| `ALLOWED_ORIGINS` | CORS 허용 오리진 (콤마 구분) | - |

## API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| GET | `/` | 서버 정보 |

## 서버 담당 기능 (개발 예정)

- zone 관리
- 플레이어 위치/세션 관리
- 몬스터 인스턴스 / 리스폰 / AI
- 공격 판정 / 유저 피격
- 전투 이벤트 / 드랍 생성
- WebSocket (merchants.battle.js 연동)

# ScholarPath

ScholarPath is a React/Vite admissions counseling prototype inspired by Borderless. It includes a polished public frontend, university/program/story catalog data, Nova chat UI, and a small Express API that exposes the same catalog through backend routes.

## Run The Project

```bash
npm install
npm run dev
```

Frontend runs on the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Run The API

```bash
npm run server
```

API routes run at `http://localhost:8787/api`.

Available routes:

- `GET /api/health`
- `GET /api/home`
- `GET /api/universities?q=&country=&tag=&aid=true`
- `GET /api/programs?q=&discipline=&cost=&type=`
- `GET /api/stories?q=&tag=`
- `GET /api/acceptances?q=`

## Structure

- `src/pages`: route-level React pages.
- `src/components`: reusable UI pieces such as `LogoTile`, `Navbar`, and `Footer`.
- `src/api/catalog.js`: frontend catalog facade used by React pages.
- `shared/data`: single source of truth for universities, programs, stories, acceptances, and home-page content.
- `server/routes`: Express route definitions.
- `server/repositories`: backend data access/filtering logic.

## Quality Checks

```bash
npm run lint
npm run build
```

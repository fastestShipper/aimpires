# Age of AI-mpires 🏰🤖

> Un juego de estrategia donde los ciudadanos son **agentes de IA autónomos**.

POC de abril 2026: un mundo en mapa hexagonal/por regiones donde cada ciudadano
es un agente con tareas, estado y trabajo — impulsado por un LLM cuando hay
clave configurada, o con salidas simuladas si no la hay.

## Concepto

"Age of Empires" reimaginado como **Age of AI-mpires**: en vez de unidades que
obedeces, tienes agentes que piensan. El jugador diseña el mundo y asigna
tareas; los agentes las procesan (con LLM real o simulación) y el mundo
reacciona.

## Stack

- Next.js (App Router) + React 19 + Zustand
- Pathfinding propio (`src/lib/pathfinding.ts`)
- LLM opcional: `ANTHROPIC_API_KEY` en `.env.local` — sin clave, los ciudadanos
  producen trabajo simulado

## Correr localmente

```bash
npm install
npm run dev
# abre http://localhost:3000
```

Opcional, para ciudadanos con trabajo real:

```bash
cp .env.example .env.local
# agrega ANTHROPIC_API_KEY (ver .env.example)
```

## Estructura

```
src/
├── lib/        worlds (mapas), agents, pathfinding, storage, llm
├── components/ WorldMap, HUD, TaskPanel, HeroScene
└── app/        páginas: mapa del mundo, mundo por id, API de tareas
```

## Concepto clave

Los agentes no son unidades: son **ciudadanos con agencia**. El juego explora
qué pasa cuando una civilización delega su trabajo a agentes autónomos — y
quién controla a quién.

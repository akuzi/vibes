# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibes is a collection of interactive coding experiments built with Next.js. The project is a showcase of creative visualizations, games, AI integrations, and programming language experiments. Each experiment is self-contained under `/experiments/*` with its own page.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with Turbopack
npm run dev

# Build (includes linting)
npm run build

# Start production server
npm start

# Lint only
npm run lint
```

Development server runs at `http://localhost:3000`

## Environment Setup

Create a `.env` file in the root with:
```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENTOPOGRAPHY_API_KEY=your_opentopography_api_key_here
```

## Architecture

### Directory Structure

- **`src/app/`** - Next.js 15 App Router structure
  - **`page.tsx`** - Landing page with experiment menu
  - **`layout.tsx`** - Root layout with Geist fonts
  - **`experiments/[name]/page.tsx`** - Individual experiment pages
  - **`api/[name]/route.ts`** - API routes for server-side logic
- **`src/components/`** - Reusable React components
- **`src/lib/`** - Shared utilities and libraries
- **`public/`** - Static assets (images, CSVs, models)

### Key Patterns

**Experiments are self-contained pages:**
- Each experiment lives in `src/app/experiments/[name]/page.tsx`
- Most are client components (`'use client'`)
- Complex logic is extracted to `src/lib/`
- Related components go in `src/components/[name]/`

**API Routes:**
- Located in `src/app/api/[name]/route.ts`
- Export named functions: `GET`, `POST`, etc.
- Use Next.js 15 `NextRequest` and `NextResponse`
- OpenAI integrations use `gpt-3.5-turbo` for chat, `tts-1-hd` for audio

**State Management:**
- Most experiments use React hooks (useState, useRef, useEffect)
- Audio engines typically use refs to persist across renders
- Running state uses both state and ref pattern for animation loops

**Vercel Blob Storage:**
- Used for persistence (e.g., Pokemon high scores)
- Import from `@vercel/blob`
- Pattern: `head()` to check existence, `put()` to save, fetch URL to read

### Technology Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS 4
- **3D Graphics:** Three.js with three-stdlib
- **Audio:** soundfont-player, Web Audio API
- **AI:** OpenAI API (chat completions, TTS)
- **Code Editing:** Monaco Editor, react-simple-code-editor with Prism.js
- **Build:** TypeScript 5, strict mode enabled

### TypeScript Configuration

- Path alias: `@/*` maps to `src/*`
- Strict mode enabled
- No build errors tolerated (eslint, TypeScript)

### Build & Lint Configuration

The build process (`npm run build`) runs linting first, then builds. Both ESLint and TypeScript errors will fail the build:
- ESLint checks all directories: src, app, pages, components, lib
- TypeScript strict mode with no build errors allowed
- All Next.js pages must pass linting before deployment

### Experiments

Current experiments include:
1. **Musical Cells** - Conway's Game of Life with generative music
2. **Polish Notation Calculator** - Prefix notation calculator
3. **Pretzl** - Custom prefix programming language interpreter (mix of Python/Lisp)
4. **Dialectica** - AI-powered pros/cons argument analysis
5. **Gas Giant** - 3D procedural planet generator
6. **Sokoban Solver** - Classic puzzle game with AI solver
7. **Voxel World** - 3D Australia terrain from real elevation data
8. **AI Voice Chat** - OpenAI voice chat with emotion detection (face-api.js)
9. **Speaking Avatar** - Lip-sync animation for text-to-speech
10. **Crochet Simulator** - Animated crochet pattern renderer
11. **Pokemon Catch** - Click-to-catch game with high scores

### Common Utilities

- **`src/lib/colors.ts`** - Color schemes for visualizations
- **`src/lib/music.ts`** - Musical scales and note definitions
- **`src/lib/audio.ts`** - AudioEngine class for soundfont playback
- **`src/lib/game-of-life.ts`** - Conway's Game of Life logic with glitch effects
- **`src/lib/patterns.ts`** - Predefined cellular automata patterns

### Adding New Experiments

1. Create `src/app/experiments/[name]/page.tsx`
2. Add to landing page menu in `src/app/page.tsx`
3. Extract complex logic to `src/lib/[name].ts`
4. Create API routes in `src/app/api/[name]/route.ts` if needed
5. Add reusable components to `src/components/[name]/`

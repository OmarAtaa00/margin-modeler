# Margin Modeler

Margin Modeler is a browser-based application for planning project scenarios, assigning resources, modeling cost and bill rates, calculating direct hours, and comparing project margin outcomes.

## Current status

Margin Modeler is under active alpha development. Features, interfaces, calculations, and data structures may change.

Users should export important workspaces regularly and keep independent backup copies.

## Current capabilities

- Create, rename, clone, compare, and delete project scenarios
- Select and lock a scenario as the base comparison
- Add, edit, clone, and remove resource assignments
- Configure project and resource dates
- Set cost rates, bill rates, allocation, and direct hours
- Calculate working days, capacity hours, cost, revenue, and margin
- Compare scenario margins against a selected base project
- Visualize assignments on a 12-week timeline
- Import and export workspace data as JSON
- Authenticate users through Supabase
- Store authenticated workspace data in Supabase
- Maintain a browser local-storage recovery copy
- Use responsive light and dark interfaces

## Technology

- React
- TypeScript
- Zustand
- Vite
- Supabase

## Application architecture

The React application is loaded from `src/main.tsx`.

The main application is wrapped by:

1. `UserProvider`, which manages the Supabase authentication session
2. `AuthGate`, which displays authentication controls when no session exists
3. `App`, which provides project modeling, calculations, persistence, import, export, and user-interface functionality

Project state is managed with Zustand.

Authenticated workspace data is stored in the Supabase `projects` table. The application also maintains a browser local-storage copy as a recovery fallback.

## Requirements

Use a currently supported Node.js release compatible with the installed Vite and Supabase packages.

Node.js 22.12 or newer is recommended for the current dependency set.

## Local development

Install the committed dependencies:

```bash
npm ci
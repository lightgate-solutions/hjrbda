# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HJRBDA is a full-stack enterprise management system built with Next.js 15, React 19, TypeScript, and PostgreSQL. The application manages HR, projects, tasks, documents, email communications, and notifications within an organization.

## Common Commands

### Development

- Start development server with Turbopack:

  ```bash
  pnpm run dev
  ```

- Build for production (with Turbopack):

  ```bash
  pnpm run build
  ```

- Start production server:

  ```bash
  pnpm run start
  ```

### Code Quality

- Format code with Biome:

  ```bash
  pnpm run format
  ```

- Lint code with Biome:

  ```bash
  pnpm run lint
  ```

- Format and lint in one command:

  ```bash
  pnpm run check
  ```

### Database Operations

- Stop the database container:

  ```bash
  pnpm run db:stop
  ```

- Push schema updates to the database:

  ```bash
  pnpm run db:push
  ```

## Architecture Overview

HJRBDA follows a modular architecture organized by domain/feature:

### Frontend Structure

- **App Router**: Uses Next.js 15 App Router with React Server Components
- **Layout Groups**:
  - `(auth)`: Authentication pages (login, register)
  - `(dashboard)`: Dashboard pages for different modules

### Backend Structure

- **API Routes**: Next.js API routes for RESTful endpoints
- **Server Actions**: RSC actions for server-side operations
- **Database**: PostgreSQL with Drizzle ORM

### Key Modules

1. **Authentication**
   - Uses Better Auth (email/password)
   - Role-based access control (user, admin)
   - Session management

2. **HR Module**
   - Employee records
   - Departmental structure
   - Manager hierarchy

3. **Task Management**
   - Task creation/assignment
   - Status tracking
   - Submission/review workflow

4. **Project Management**
   - Project records
   - Milestones
   - Budget and expense tracking

5. **Document Management**
   - File upload/download with R2 (S3-compatible)
   - Folder organization
   - Access control

6. **Email System**
   - Email composition
   - Threading
   - Read/archive status

7. **Notification System**
   - Real-time notifications
   - User preferences

## Key Patterns and Conventions

### Auth Patterns

1. **Server-side Authentication**

   ```javascript
   const session = await auth.api.getSession({ headers: await headers() })
   ```

2. **Client-side Authentication**

   ```javascript
   const session = await authClient.useSession()
   ```

### Database Patterns

1. **Schema Updates**
   - Update schema in `src/db/schema/`
   - Export from `src/db/schema/index.ts`

### Component Structure

- Reusable UI components: `src/components/ui/`
- Module-specific components: `src/components/[module-name]/`
- Page layouts: `src/components/layouts/`

### State Management

- Server state: React Query
- Form state: React Hook Form with Zod validation
- UI state: React's built-in state management

## Technical Stack Details

- **Framework**: Next.js 15.5.10 with App Router
- **UI**: React 19.1.0 with TypeScript 5
- **Styling**: TailwindCSS 4 with Shadcn/ui components
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Authentication**: Better Auth 1.3
- **Form Handling**: React Hook Form 7.64 with Zod 4.1
- **Data Fetching**: React Query 5.90 and SWR 2.3
- **Code Quality**: Biome 2.1.4 (replaces ESLint/Prettier)
- **Package Manager**: PNPM

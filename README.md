# HJRBDA MANAGEMENT SOFTWARE

## To-Do

- Ensure to update r2 public url when live

## Repo Architecture

- `src/app/(dashboard)/` folder: where all pages will be created
- `src/actions/[module name]` folder: store all server actions in here (should be grouped)
- `src/app/api/` folder: Can optionally use api routes
- `src/components/[module name]/` folder: each modules components should be grouped by folder here
- `src/components/ui/` folder: re-usuable ui components **stored** here
- `src/db/schema/` folder: all db schemas go in here
- `src/lib/` folder: used for shared libs
- `src/types/` folder: used for types
- `src/utils/` folder: used for shared utilities

## Requirements

- disable prettier and es-lint extensions (if any)
- install biome extention for faster code formatting and linting
- copy env file from `.env.example` to `.env.local` or `.env`

## Commands

- pnpm run check: format all documents with biome.js

## Setup Database

1. ensure docker is open
2. ensure postgres image is present
3. start db

```bash
pnpm run db:start
```

4. push db schema

```bash
pnpm run db:push
```

5. view db in browser

```bash
pnpm run db:studio
```

### extra database commands to know

- stopping db service

```bash
pnpm run db:stop
```

- generating db migration file

```bash
pnpm run db:generate
```

### steps to update database

- create a file or make a change in db/schema/ folder
- export the file in dbb/schema/index.ts file
- run

```bash
pnpm run db:push
```

to push changes to db

## Need to know

1. **get user session object - server side**

```javascript
const session = await auth.api.getSession( {headers: await headers()} )
```

2. **get user session object - client side**

```javascript
const session = await authClient.useSession()
```

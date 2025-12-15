# Buena Property Dashboard

A modern property management dashboard for German real estate, featuring AI-powered document extraction from Teilungserklärung (declaration of division) documents.

## Features

### 🏢 Property Management

- **WEG Properties** — Wohnungseigentümergemeinschaft (condominium associations)
- **MV Properties** — Mietverwaltung (rental property management)
- Full CRUD operations for properties, buildings, and units
- Track co-ownership shares (MEA), unit types, and building details

### 🤖 AI-Powered Data Extraction

- Upload PDF documents (Teilungserklärung)
- Automatic extraction of property data using GPT
- Pre-fill forms with extracted information:
  - Property name and type
  - Buildings with addresses
  - Units with floor, size, rooms, and co-ownership shares
  - Special use rights (Sondernutzungsrechte)
  - Property manager and accountant appointments

### 📊 Dashboard

- Overview statistics (total properties, buildings, units)
- Quick actions for property creation
- Filterable property list with WEG/MV badges

### 🔐 Authentication

- [Better Auth](https://better-auth.com) is installed and configured
- No auth providers enabled (demo project)

## Tech Stack

| Category      | Technology                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| Framework     | [Next.js 15](https://nextjs.org) with App Router                            |
| Language      | [TypeScript](https://www.typescriptlang.org/)                               |
| Styling       | [Tailwind CSS 4](https://tailwindcss.com)                                   |
| Database      | PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)                     |
| API           | [tRPC](https://trpc.io) for type-safe APIs                                  |
| Auth          | [Better Auth](https://better-auth.com)                                      |
| AI            | [Vercel AI SDK](https://sdk.vercel.ai) with OpenAI                          |
| UI Components | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Linting       | [Biome](https://biomejs.dev/)                                               |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd buena-property-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/buena_property"

   # Authentication
   BETTER_AUTH_SECRET="your-secret-key-here"

   # OpenAI (for AI extraction)
   OPENAI_API_KEY="sk-..."
   ```

4. **Start the database**

   ```bash
   ./start-database.sh
   # Or use your own PostgreSQL instance
   ```

5. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Dashboard layout group
│   │   ├── page.tsx          # Dashboard overview
│   │   └── properties/       # Property pages
│   │       ├── page.tsx      # Properties list
│   │       ├── new/          # New property wizard
│   │       └── [id]/         # Property detail page
│   └── api/                  # API routes
│       ├── auth/             # Better Auth endpoints
│       ├── trpc/             # tRPC handler
│       └── upload/           # File upload endpoint
├── components/
│   ├── ui/                   # Base UI components (shadcn)
│   ├── wizard/               # Property creation wizard steps
│   └── property-actions.tsx  # Edit/Delete property dialogs
├── lib/
│   └── ai/                   # AI extraction logic
│       └── extract-property-data.ts
├── server/
│   ├── api/                  # tRPC routers
│   │   └── routers/
│   │       ├── property.ts   # Property CRUD operations
│   │       └── ai.ts         # AI extraction endpoint
│   ├── db/                   # Database schema & connection
│   └── better-auth/          # Auth configuration
├── trpc/                     # tRPC client setup
└── types/
    └── declaration-of-division.ts  # Type definitions
```

## Available Scripts

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start development server with Turbopack |
| `npm run build`        | Build for production                    |
| `npm run start`        | Start production server                 |
| `npm run check`        | Run Biome linter                        |
| `npm run check:write`  | Run Biome with auto-fix                 |
| `npm run check:unsafe` | Run Biome with unsafe fixes             |
| `npm run typecheck`    | TypeScript type checking                |
| `npm run db:generate`  | Generate Drizzle migrations             |
| `npm run db:migrate`   | Run database migrations                 |
| `npm run db:push`      | Push schema changes (dev only)          |
| `npm run db:studio`    | Open Drizzle Studio GUI                 |

## Database Schema

The application uses the following main tables:

- **properties** — Core property information (name, type, manager, accountant)
- **buildings** — Buildings within properties (address, floors, elevator)
- **units** — Individual units (apartments, offices, parking, gardens)

## AI Extraction

The AI extraction feature uses OpenAI's GPT model to parse German Teilungserklärung documents. It extracts:

- Land registry information (Grundbuch)
- Building details with addresses
- Unit specifications with MEA shares
- Special use rights (terraces, gardens, roof terraces)
- Management appointments

Upload a PDF through the property creation wizard, and the AI will pre-fill the form with extracted data.

## License

Private project.

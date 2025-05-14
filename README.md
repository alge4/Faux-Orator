# Faux Orator - D&D Dungeon Master's Assistant

Faux Orator is an AI-powered Dungeon Master's assistant for D&D campaigns, featuring:

- AI-assisted session planning
- Campaign tracking and management
- Dynamic dialogue and narration
- Voice chat capabilities for remote play

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Supabase CLI](https://supabase.com/docs/guides/cli) for local development
- An [OpenAI API key](https://platform.openai.com/account/api-keys)
- An [Agora](https://www.agora.io/) account for voice chat (optional)

### Local Development Setup

1. **Clone the repository and install dependencies:**

```bash
git clone https://github.com/yourusername/faux-orator.git
cd faux-orator
npm install
```

2. **Set up local Supabase:**

```bash
# Start Supabase locally
supabase start

# Apply the database schema
supabase db reset
```

3. **Configure environment variables:**

```bash
# Copy the sample .env file
cp .env.development .env.local
```

Edit `.env.local` with your own API keys:

- Keep the Supabase values as they are for local development
- Add your OpenAI API key
- Add your Agora App ID (if using voice chat)

4. **Start the development server:**

```bash
npm run dev
```

5. **Generate sample data (optional):**

Open the Supabase Dashboard and run the following in the SQL Editor:

```sql
SELECT generate_mock_data('00000000-0000-0000-0000-000000000000');
```

Replace the UUID with your Supabase user ID if you've created an account.

### Production Deployment

For production deployment:

1. Create a Supabase project
2. Apply the schema using `src/supabase/schema.sql`
3. Configure your environment variables in your hosting provider

## Database Schema

The application uses a Supabase PostgreSQL database with the following main tables:

- `campaigns` - Campaign information and settings
- `npcs` - Non-player characters
- `locations` - Locations within campaigns
- `factions` - Groups and organizations
- `items` - Items and artifacts
- `session_plans` - AI-generated session plans
- `story_arcs` - Campaign narrative arcs
- `action_consequences` - Player action consequences
- `agent_logs` - AI agent interaction logs

## Features

### Session Planning

The Session Planning feature allows Dungeon Masters to:

- Collaboratively plan gameplay sessions with AI
- Create structured session outlines
- Generate story beats, encounters, and NPC interactions
- Reference campaign entities in context

### Voice Chat

The Voice Chat integration enables:

- Real-time audio communication
- Push-to-talk functionality
- Background music and sound effects
- Voice modulation for NPCs (coming soon)

### AI Agents

The application uses specialized AI agents:

- **Planning Agent**: Creates session plans and story arcs
- **Tracking Agent**: Monitors campaign state and events
- **Dialogue Agent**: Generates NPC dialogue and narration

## Architecture

- Frontend: React + TypeScript with Vite
- Backend: Supabase for database and authentication
- AI: OpenAI GPT-4 for intelligent assistance
- Voice: Agora.io for real-time audio

## License

[MIT License](LICENSE.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Contact

For questions or support, please open an issue on GitHub.
# MCP Startup commands

## Browser Tools
npx @agentdeskai/browser-tools-server@latest
## Supabase

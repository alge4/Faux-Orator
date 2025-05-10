# Faux-Orator Backend

This is the backend implementation for Faux-Orator, a TTRPG Assistant with a hybrid database architecture using Supabase (PostgreSQL) and MongoDB Atlas.

## Architecture Overview

The backend follows a hybrid database approach:

- **Supabase (PostgreSQL)**: Handles user authentication, profiles, and permissions
- **MongoDB Atlas**: Stores campaign content like NPCs, locations, and items

## Directory Structure

```
backend/
├── config/             # Database configuration
│   ├── agent-factory.js # Agent creation and factory
│   ├── database.js     # Unified database access layer
│   ├── mongodb.js      # MongoDB connection
│   ├── mongodb-agent.js # Agent-specific MongoDB access
│   └── supabase.js     # Supabase connection
├── middleware/         # Express middleware
│   └── auth.js         # Authentication middleware
├── models/             # Data models
│   └── npc.js          # NPC model (MongoDB)
├── routes/             # API routes
│   ├── agents.js       # Agent database access routes
│   └── npcs.js         # NPC routes
├── utils/              # Utility functions
│   └── agent-communication.js # Helper for AI agent communication
├── env.example         # Example environment variables
├── package.json        # Dependencies
├── README.md           # Documentation
└── server.js           # Main server file
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   cd backend
   npm install
   ```
3. Set up environment variables:
   - Copy `env.example` to `.env`
   - Fill in your Supabase and MongoDB credentials
4. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

### NPCs

- `GET /api/npcs/campaign/:campaignId` - Get all NPCs for a campaign
- `GET /api/npcs/:id` - Get single NPC
- `POST /api/npcs` - Create a new NPC
- `PUT /api/npcs/:id` - Update an NPC
- `GET /api/npcs/search/:campaignId` - Search NPCs
- `PATCH /api/npcs/:id/lock` - Lock/unlock NPC fields

### AI Agents

- `POST /api/agents/initialize` - Initialize an agent session
- `POST /api/agents/query` - Execute a database query through an agent
- `POST /api/agents/release` - Release an agent session

## Authentication

Authentication is handled through Supabase. All API endpoints require a valid JWT token:

```
Authorization: Bearer <your_jwt_token>
```

## Locking Mechanism

Entities can be locked to prevent unwanted modifications:

- `frozen_by_dm`: Completely locks the entity from all updates
- `writeable_by_agents`: Controls whether AI agents can modify the entity
- `locked_fields`: Specific fields that are locked from modification

## AI Agent Access

The system includes a specialized database access layer for AI agents with:

- Agent-specific permissions based on agent type
- Field-level locking enforcement
- Collection-level access control
- Automatic metadata tracking for agent modifications

Agent types include:

- `DM_Assistant`: Primary orchestrator with full access
- `NPC_Agent`: Limited to NPC data
- `Lorekeeper_Agent`: Access to world lore, timeline, and history
- `World_Agent`: Access to locations, factions, and items
- `Rules_Agent`: Access to mechanics and rules collections
- `Chronicle_Agent`: Access to session logs and highlighted actions

## Next Steps

- Implement additional routes for locations, factions, etc.
- Add vector embedding for semantic search
- Create campaign management endpoints
- Set up MongoDB indexes for optimized queries

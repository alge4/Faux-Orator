# Agentic Network Structure

Faux-Orator uses a **central orchestration model**. The Primary Agent, known as the **DM's Assistant**, communicates directly with the Dungeon Master and coordinates with a group of **Specialist Agents** responsible for specific domains of the campaign world. This includes reading, updating, and managing various types of data objects such as NPCs, locations, factions, session plans, and in-game events.

## Interaction Modes

- **Planning Mode**: Worldbuilding, quest design, character creation
- **Running Mode**: Real-time in-game support based on voice transcription
- **Review Mode**: Post-game session analysis and recap generation

Mode transitions preserve consistent data state across all agents. Agents may deactivate outside of their designated operational mode (e.g., Planning-only agents may be disabled during Running). Unexpected mode transitions are handled by checkpointing agent memory and flagging resynchronization steps.

---

## 2. Primary Agent: DM's Assistant

- **Tone**: Friendly, smart-casual, professional
- **Function**: Direct communication with the DM, context awareness, response synthesis, query delegation
- **Responsibilities**:
  - Manage dialogue with the DM
  - Route requests to appropriate specialist agents
  - Maintain session mode awareness (Planning, Running, Review)
  - Respect data freeze states and permissions
  - Maintain recent session history (default: current session + 3 previous sessions)

### Agent Memory Management

- Each agent has its own **contextual memory profile** for short-term session focus and long-term entity recall.
- The **shared memory blackboard** and `blackboard_tasks` are part of a unified system. Ephemeral notes and unresolved tasks reside together, structured and queryable.
- The **DM's Assistant cache** remains transient between sessions, optimized for immediate scene tone and choice retention.
- Memory pruning archives all but the current and three most recent sessions to an `archived_sessions` table with indexing for on-demand recall.

Agent state is persisted between sessions. Each agent maintains a contextual memory profile. Some transient data is centralized in the shared memory blackboard or the DM's Assistant cache.

## 3. Specialist Agents and Domains

| Agent Name       | Domain Responsibility                                                  | CRUD Permissions      | Collaboration Method      |
| ---------------- | ---------------------------------------------------------------------- | --------------------- | ------------------------- |
| Lorekeeper Agent | World lore, timeline, history                                          | R/W unless frozen     | Routed via DM's Assistant |
| NPC Agent        | All named NPCs                                                         | R/W unless frozen     | Routed via DM's Assistant |
| Player Agents    | Player character tracking                                              | R/W unless frozen     | Listen to player input    |
| Rules Agent      | Mechanics, house rules, additional rules research                      | R/W                   | Direct dispatch           |
| Chronicle Agent  | Speech-to-text processing, structured event tagging                    | R/W live session logs | Feeds DM Assistant        |
| World Agent      | Factions, locations, and items (initially unified; future split-ready) | R/W unless frozen     | Synchronized updates      |
| Story Agent      | Narrative arcs for NPCs, factions, and overarching plots               | R/W unless frozen     | Routed via DM's Assistant |

> World Agent may later split into `FactionAgent`, `LocationAgent`, and `ItemAgent`. Transition strategy: use unified interfaces for cross-entity references, and auto-migrate historical data using lookup tables and new relationships.

| Agent Name       | Domain Responsibility                                    | CRUD Permissions      | Collaboration Method      |
| ---------------- | -------------------------------------------------------- | --------------------- | ------------------------- |
| Lorekeeper Agent | World lore, timeline, history                            | R/W unless frozen     | Routed via DM's Assistant |
| NPC Agent        | All named NPCs                                           | R/W unless frozen     | Routed via DM's Assistant |
| Player Agents    | Player character tracking                                | R/W unless frozen     | Listen to player input    |
| Rules Agent      | Mechanics, house rules, additional rules research        | R/W                   | Direct dispatch           |
| Chronicle Agent  | Speech-to-text processing, structured event tagging      | R/W live session logs | Feeds DM Assistant        |
| World Agent      | Factions, locations, and items                           | R/W unless frozen     | Synchronized updates      |
| Story Agent      | Narrative arcs for NPCs, factions, and overarching plots | R/W unless frozen     | Routed via DM's Assistant |

> Note: World Agent can be split into `FactionAgent`, `LocationAgent`, and `ItemAgent` when:
>
> - Performance degrades from large-scale campaigns
> - Specific logic per entity type diverges
> - Cross-entity relationships can be maintained via shared IDs and relational lookups

---

## 4. Data Structure Overview

Each campaign has an isolated dataset to preserve long-term narrative context. Shared structures may be used for reusable blackboard tasks.

### Key Interfaces

- **Campaign**: Metadata for each campaign instance
- **CampaignMember**: Tracks DMs and players involved
- **NPC, Location, Faction, Item**: World elements
- **SessionPlan**: Pre-game session data
- **ActionConsequence**: Tracks major story choices
- **EntityType Enum**: Unified type system for data links
- **CampaignMode Enum**: Planning, Running, Review

### Locking Schema

All entities support freeze-level control. These flags apply to NPCs, Locations, Factions, Items, Quests, and more.

```ts
writeable_by_agents: boolean;
frozen_by_dm: boolean;
locked_fields: string[];
unlock_at?: timestamp;
```

- Maintain a separate **lockable_fields** schema per entity type to validate `locked_fields`.
- Time-based auto-unfreeze is included in the initial version using `unlock_at` per field.
- Queued revision requests (when attempting to edit locked fields in Planning/Review mode) will be handled in a separate `revision_queue` structure.
- In Running mode, edit attempts trigger a non-fatal Assistant warning.

```ts
writeable_by_agents: boolean;
frozen_by_dm: boolean;
locked_fields: string[]; // optional field-level locks, e.g., ['stat_block', 'goals']
```

Locking applies at the entity level but can cascade to subfields. Partial unfreezing allows individual fields to be unlocked selectively. Optional: auto-unfreeze timers may be applied to temporary locks (e.g., reveal events).

---

## 5. Agent Collaboration Model

Faux-Orator uses a **central orchestration pattern**, where the DM's Assistant coordinates all multi-agent workflows.

### Collaboration Techniques

| Use Case               | Strategy                     |
| ---------------------- | ---------------------------- |
| Answering DM Questions | Central orchestration        |
| Proposing Lore Changes | Agent proposal + arbitration |
| Session Planning       | Planning chain + blackboard  |
| Recap and Summaries    | Chronicle → Lorekeeper/NPC   |

All agent responses flow through the DM's Assistant to maintain consistency and context relevance.

### Synchronized Updates Explained

Multiple agents—such as the Chronicle Agent, Lorekeeper, and World Agent—can contribute to shared world elements. The system:

- Merges **compatible** updates:
  - Different fields on the same object (e.g., Lorekeeper updates `history`, Chronicle tags `status`)
  - List-based non-conflicting additions (e.g., tags, allies)
- Flags **conflicting** updates:
  - Conflicts on single-value fields (e.g., two agents set different `current_location` values)
  - Contradictions in narrative (e.g., an NPC marked both "alive" and "deceased" by different sources)

Coordination occurs through the conflict queue:

Priority levels are based on the impact of the change and entity type. Example criteria:

- High: Plot-critical NPC state or quest outcomes
- Medium: Location updates, current holder fields, session goals
- Low: Cosmetic changes (appearance, tags)

Use agent-generated confidence scores and predefined rulesets to determine if a conflict is `auto_resolvable`. A `resolution_strategy` field should also be recorded:

```ts
resolution_strategy: "auto" | "dm_manual" | "rule_applied";
```

```ts
conflict_resolution_queue: {
  id: string;
  entity_id: string;
  field: string;
  proposed_values: json[];
  source_agents: string[];
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  auto_resolvable: boolean;
  requires_dm: boolean;
  resolution_strategy?: 'auto' | 'dm_manual' | 'rule_applied';
}
```

- Use agent confidence scores or field type rules to determine `auto_resolvable`
- DM receives UI notifications for high-priority unresolved conflicts

Multiple agents—such as the Chronicle Agent, Lorekeeper, and World Agent—can contribute to shared world elements. The system:

- Merges **compatible** updates (e.g., updating different fields of a faction: status and headquarters)
- Flags **conflicting** updates (e.g., contradictory values for the same field) for DM review
- Prioritizes updates during Running Mode based on timestamp and context relevance

Conflicts are queued:

```ts
conflict_resolution_queue: {
  id: string;
  entity_id: string;
  field: string;
  proposed_values: json[];
  source_agents: string[];
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  auto_resolvable: boolean;
}
```

Automatic resolution may apply to low-risk cases (e.g., spelling corrections, tag additions). Others require DM intervention.

---

## 6. DM Control & Transparency

The DM can:

- View and modify all campaign data via a structured interface
- Freeze entities or individual fields from agent writes
- Audit changes via:

```ts
agent_activity_logs: {
  agent_name: string;
  entity_id: string;
  field_modified: string;
  old_value: json;
  new_value: json;
  mode: "Planning" | "Running" | "Review";
  reviewed_by_dm: boolean;
  timestamp: string;
}
```

- Logs should be extended to support rollback/undo and DM UI review of recent changes
- A dedicated **changelog panel** in the interface will allow DMs to approve, revert, or freeze changes made by agents

The DM can:

- View and modify all campaign data via a structured interface
- Freeze entities or individual fields from agent writes
- Audit changes via:

```ts
agent_activity_logs: {
  agent_name: string;
  entity_id: string;
  field_modified: string;
  old_value: json;
  new_value: json;
  mode: "Planning" | "Running" | "Review";
  reviewed_by_dm: boolean;
}
```

- Override, re-prompt, or validate AI-generated outputs

---

## 7. Voice Agents and NPC-Specific Interaction

Voice agents combine text-to-speech with NPC-specific behavior. All voice interactions are routed through the DM's Assistant for tone, context, and validation.

### NPC Agents

- Spawned on-demand, stateless between invocations but tied to persistent records
- Loaded from personality templates and session memory snapshots

### Dialogue Interface

- Chat overlay, activated by in-game triggers or DM prompt
- Provides 2–3 summarized response options generated by the NPC Agent and reviewed by the DM's Assistant

### Voice Profile Schema (Embedded in NPC Entity)

Voice data is embedded in the `NPC` object for manual control by the DM.

```ts
voice_profile: {
  voice_id: string;
  pitch: number;
  speed: number;
  tone: string;
}
```

This embedded model is the canonical structure. External `npc_voice_profiles` tables or fragments are deprecated.ts
voice_profile: {
voice_id: string; // OpenAI or ElevenLabs voice reference
pitch: number;
speed: number;
tone: string;
}

````ts
NPC: {
  ...,
  voice_profile: {
    voice_id: string; // OpenAI or ElevenLabs voice reference
    pitch: number;
    speed: number;
    tone: string;
  }
}
```ts
npc_voice_profiles: {
  npc_id: string;
  voice_id: string; // OpenAI or ElevenLabs voice reference
  pitch: number;
  speed: number;
  tone: string;
}
````

Voice profiles should be stored persistently and queried during NPC Agent generation.

### Voice Processing and Caching

- TTS is provided by **OpenAI TTS** or **ElevenLabs API**.
- Each campaign has its own configurable **resource queue limit** (default: 2–3 concurrent NPCs).
- Caching of voice clips is implemented using:

```ts
voice_cache: {
  npc_id: string;
  dialogue_hash: string;
  audio_url: string;
  created_at: timestamp;
  expires_at: timestamp;
}
```

- Cache expiration is configurable per campaign (e.g., 30-day default).

- Use **OpenAI TTS** or **ElevenLabs API** for generation
- Implement a **resource queue** to limit concurrent requests (e.g., max 2-3 NPCs speaking simultaneously)
- Employ a **caching mechanism** for frequently used NPC voice clips to avoid redundant generation
  - Caching key: `npc_id + dialogue_hash`
  - Storage: local or CDN with fallback

Voice agents combine text-to-speech with NPC-specific behavior. All voice interactions are routed through the DM's Assistant for tone, context, and validation.

### NPC Agents

- Spawned on-demand, stateless between invocations but tied to persistent records
- Loaded from personality templates and session memory snapshots

### Dialogue Interface

- Chat overlay, activated by in-game triggers or DM prompt
- Provides 2–3 summarized response options generated by the NPC Agent and reviewed by the DM's Assistant

### Voice Profile Schema

```ts
npc_voice_profiles: {
  npc_id: string;
  voice_id: string;
  pitch: number;
  speed: number;
  tone: string;
}
```

Multiple NPC voice agents can run concurrently. Audio output is managed via a resource queue to limit concurrent text-to-speech processing.

---

## 8. Planning Chains and Blackboard System

Agents collaborate via a shared **blackboard task system**, enabling cross-agent reasoning. Implement this as a new Supabase table `blackboard_tasks`.

### Blackboard Structure

```ts
blackboard_tasks: [
  {
    id: string,
    campaign_id: string,
    type: 'plot_point' | 'event' | 'location',
    status: 'incomplete' | 'resolved',
    agents: string[],
    priority: 'low' | 'normal' | 'high',
    notes?: string,
    context_refs?: string[],
    created_at: string,
    resolved_at?: string
  }
]
```

- Resolved tasks remain in the same table for auditability.
- Optional cleanup expires resolved tasks after a retention period (30+ days default).

Agents collaborate via a shared **blackboard task system**, enabling cross-agent reasoning.

### Blackboard Structure

```ts
blackboard_tasks: [
  {
    id: 'sb_001',
    campaign_id: string,
    type: 'plot_point' | 'event' | 'location',
    status: 'incomplete' | 'resolved',
    agents: string[],
    priority: 'low' | 'normal' | 'high',
    created_at: string
  }
]
```

Tasks are campaign-specific. Completed tasks persist for auditing and agent memory. Priority levels guide processing urgency.

---

## 9. Chronicle Agent Specifics

Chronicle Agent captures speech-to-text and processes it in real time.

- Applies diarization to separate speakers and tags them (`player`, `npc`, `dm`)
- Annotates dialogue type (`action`, `reaction`, `declaration`, etc.)
- Filters transcription noise with confidence scoring and context alignment
- Writes to two distinct structures:
  - `session_logs`: full logs with cleaned transcript, speaker roles, timestamps, confidence scores
  - `highlighted_actions`: key beats and cues, tagged with urgency or narrative consequence
- When multiple entities are referenced, Chronicle prioritizes by named mentions > direct action > implications

Chronicle Agent captures speech-to-text and processes it in real time.

- Applies diarization to separate speakers
- Tags speaker type (`player`, `npc`, `dm`)
- Annotates dialogue by type: `action`, `reaction`, `declaration`, etc.
- Filters transcription errors using language models and in-session context
- Writes:
  - Full logs to `session_logs`
  - Structured moments to `highlighted_actions`
  - Story updates to Story Agent and Lorekeeper

---

## 10. Next Steps

- [x] Finalize agent modularization (World Agent vs. individual type agents)
- [x] Implement lock flags and `locked_fields` in the schema with unlock timing support
- [x] Build `conflict_resolution_queue` with resolution strategy tagging and UI notification system
- [x] Extend blackboard tasks to support context memory and ephemeral notes
- [x] Extend activity logging schema for rollback, undo, and DM changelog interface
- [x] Prototype NPC Agent creation and voice overlay with campaign-level concurrency and caching config
- [x] Create versioning system for key entity changes to support future rollback
- [x] Add `session_logs` and `highlighted_actions` tables with confidence scoring and diarized speakers
- [x] Define cross-campaign sharing logic for global NPCs or reusable locations

- [ ] Implement UI components for DM changelog panel and conflict resolution interface
- [ ] Integrate with speech-to-text services for Chronicle Agent
- [ ] Create AI implementations for each specialist agent domain
- [ ] Develop voice profile editor for customizing NPC voices
- [ ] Build end-to-end testing suite for agent interactions

## 11. Data Architecture: Hybrid Database Approach

Faux-Orator implements a hybrid database architecture to accommodate both structured user data and flexible campaign content.

### Database Technologies

| Database Type   | Technology                                   | Primary Usage                                                 |
| --------------- | -------------------------------------------- | ------------------------------------------------------------- |
| SQL Relational  | Supabase (PostgreSQL)                        | User accounts, authentication, permissions, campaign metadata |
| Document NoSQL  | MongoDB Atlas                                | Campaign content, NPCs, locations, flexible entity storage    |
| Vector Database | MongoDB Atlas with Vector Search or Pinecone | Semantic search across campaign content                       |

### Integration Architecture

```
User Authentication (Supabase)
         ↓
     API Layer
       ↙   ↘
User Data    Campaign Data
(Supabase)   (MongoDB Atlas)
      ↘       ↙
   Agent Access Layer
         ↓
 Retrieval Augmented Generation
         ↓
    Agent Responses
```

### Agent Data Access

Each agent accesses data through a unified access layer that:

- Abstracts away database implementation details
- Enforces permission structures defined in section 3
- Implements the locking schema from section 4
- Routes all write operations through appropriate validation

### Data Synchronization

- Campaign elements in MongoDB use a document-oriented structure for flexible schema evolution
- Relational data in Supabase maintains user relationships and permissions
- Cross-database references use stable IDs and are maintained through the API layer
- Real-time subscriptions in both databases trigger updates to the agent knowledge state

### Context Window Management

To address AI context limitations:

- Campaign data is indexed and chunked for efficient retrieval
- Vector embeddings enable semantic search across campaign content
- Hierarchical knowledge structures allow traversal from general to specific details
- Query optimization fetches only immediately relevant data, with pathways to related content

### Implementation Roadmap

The hybrid database rollout follows a phased approach:

#### Phase 1: Foundation & Infrastructure (2-3 weeks)

- Set up MongoDB Atlas cluster with appropriate security and scaling settings
- Create core Supabase tables for user management and permissions
- Implement authentication flow that generates tokens for accessing both systems
- Build essential API endpoints that abstract database implementation details
- Set up CI/CD pipelines for consistent deployment

#### Phase 2: Data Migration & Modeling (3-4 weeks)

- Define comprehensive document schemas for campaign entities
- Create migration scripts to transform existing data (if any)
- Implement data validation layer for both SQL and NoSQL stores
- Set up cross-database referential integrity mechanisms
- Build the first version of the vector embedding pipeline

#### Phase 3: Agent Integration (4-6 weeks)

- Develop agent-specific data access patterns
- Implement the retrieval augmented generation (RAG) pipeline
- Create unified memory management system for agent context
- Build the conflict resolution system for multi-agent updates
- Integrate locking mechanisms across both databases

#### Phase 4: Advanced Features (4-5 weeks)

- Implement real-time subscriptions for live session updates
- Build caching layer for frequently accessed campaign elements
- Create the hierarchical knowledge navigation system
- Develop comprehensive query optimization for context fetching
- Implement audit logging across both databases

#### Phase 5: UI & User Experience (3-4 weeks)

- Build database administration interface for DMs
- Create visualization tools for campaign relationships
- Implement the DM changelog review interface
- Develop configuration panels for database settings
- Design monitoring dashboards for system performance

#### Phase 6: Performance & Scale (2-3 weeks)

- Implement read replicas for high-traffic campaigns
- Create database sharding strategy for large-scale deployments
- Build automated backup and recovery systems
- Implement rate limiting and quota management
- Set up monitoring and alerting for database performance

#### Phase 7: Refinement & Optimization (Ongoing)

- Monitor query patterns and optimize indexes
- Implement automated schema evolution strategies
- Fine-tune vector search parameters based on usage
- Create intelligent prefetching based on session context
- Develop caching strategies for predictable agent queries

Total timeline: ~5-6 months for complete implementation, with incremental value delivered throughout.

This hybrid approach combines SQL's relational strength for user management with NoSQL's flexibility for campaign data, while maintaining the agent interaction models defined throughout this document.

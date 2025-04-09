# AI & Backend System Design

## 📦 Supabase Backend
- Tables: `npcs`, `characters`, `sessions`, `story_arcs`, `locations`, `voice_profiles`
- Auth: User accounts and DM session ownership
- Functions: `npc_generate_voice`, `session_update_state`, `story_add_node`

## 🤖 Agentic AI Design
- Planning Agent: Constructs sessions, arcs, and consequences
- Tracking Agent: Monitors state and updates Supabase
- Dialogue Agent: Manages voice, text output, and memory context

## 🔄 Interaction Flow
1. DM makes decision or input
2. AI agent generates response
3. Supabase updates campaign data
4. Frontend displays changes and optionally generates NPC speech

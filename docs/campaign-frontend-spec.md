# 🎮 Faux-Orator Campaign Frontend Design Specification

## 🎯 Purpose
Design a dynamic, multi-modal user interface for Dungeon Masters (DMs) to manage campaigns with deep AI integration, flexible worldbuilding tools, and real-time player communication. The interface supports three core workflows: **Planning**, **Running**, and **Reviewing**.

---

## 🧱 Layout Overview

### 🗂️ Left Sidebar — Campaign Selector
- **Purpose**: Allows the user to switch between existing campaigns.
- **UI**:
  - List of campaign titles with tags like "Active", "Archived".
  - Status badges (last edited, player count, version).
  - Collapsible/minimized by default.
  - **Favorites and Recents**:
    - Show favorite campaigns at the top (`is_favorite = true`).
    - Show recently accessed campaigns based on `last_accessed` timestamp.
- **Implementation**:
  - Use `React Context` or a `Zustand` store to manage selected campaign.
  - Fetch data via Supabase client SDK using row-level security for ownership.
  - SQL Query Example:
    ```sql
    SELECT * FROM campaigns
    ORDER BY is_favorite DESC, last_accessed DESC;
    ```

---

### 🎛️ Top Toggle — Mode Switcher
- **Type**: 3-way toggle: `Planning | Running | Review`
- **State-aware Rendering**:
  - Toggle sets an application-wide state for conditional rendering.
  - Use `Zustand` or `useReducer` to persist state between views.
  
**Behavior Per Mode:**
- **Planning Mode**:
  - Unlocks editing tools for worldbuilding.
  - Enables drag-and-drop content into AI chats.
- **Running Mode**:
  - Enables live tracking, locked story states, and voice control.
- **Review Mode**:
  - Displays historical logs, session recaps, AI-generated summaries.

---

### 🎙️ Right Sidebar — Voice Channels (Vox-Communis)
- **Default Channels**: Primary, Main, Whisper
- **Functionality**:
  - Display active speakers and audio levels.
  - Let DM drag NPCs or players into channels.
  - Whisper mode supports DM↔Player or DM↔NPC quick chats.
- **Implementation**:
  - Integrate **Agora.io** or **LiveKit** via their React SDK.
  - Use WebSockets or Supabase Realtime to sync presence state.

---

## 🖥️ Central Panel — Dynamic Workspace

### 🔁 Context-aware Layout Switching
Depending on the selected display mode:

#### 1. Chat View
- Text interface for AI interaction.
- Shows inline references to content (NPCs, items, etc.)
- Supports autocomplete for slash commands or content insertion.
- Drag referenced entries from sidebars into the prompt context.

#### 2. Network View (World Graph)
- Interactive graph using `Cytoscape.js` or `D3.js`
- Nodes = campaign entities (people, places, plots)
- Edges = relationships, events, influence
- Features:
  - Add/remove nodes
  - Re-link or unlink narrative elements
  - Context menu for node editing

#### 3. Data View (Tab System)
- Excel-like tabular view at the bottom of the interface.
- Tabs: Characters, Places, Lore, Items, Homebrew Monsters, Rules, Story Points, Encounters, NPCs, Players, Locations, Events, Factions, Quests
- Expands vertically to fill central panel when active.
- Form-based or markdown-style field editing per entity.
- **AI Interaction**:
  - AI-generated edits are shown as suggestions.
  - Users can mark fields or entire rows as **immutable**.
  
**Implementation**:
- Use a tabbed layout with `Headless UI Tabs` or `Radix UI`.
- Use controlled components with local state syncing back to Supabase.
- Locking logic can be implemented via a `locked: boolean` flag on fields.

---

## 🧠 AI Integration

### Behavior
- AI reads visible context: current mode, selected campaign, last interactions.
- Can suggest changes to world state, NPC behavior, session structure.
- Can reference campaign content from Supabase.

### Features
- Drag in entities to update AI memory/context dynamically.
- Mark content as immutable to prevent overwriting.
- AI feedback loop: all changes require user approval.

### Implementation
- AI calls via serverless function (`/api/ai`) to OpenAI API.
- Context window JSON includes `pinnedEntities[]` and `mode`
- AI responses annotated with `[referenced: true]` for UI highlighting.

---

## 🧩 Data & State Architecture

### Supabase Tables (Simplified)
- `campaigns`: id, title, owner_id, created_at, is_favorite, last_accessed
- `entities`: id, campaign_id, type, name, content, locked
- `sessions`: id, campaign_id, mode, log, started_at
- `voice_channels`: id, campaign_id, name, participants[]

### Entity Types Supported
- Characters
- Places
- Lore
- Items
- Homebrew Monsters
- Rules
- Story Points
- **Encounters**
- **NPCs**
- **Players**
- **Locations**
- **Events**
- **Factions**
- **Quests**

### Frontend State
- `campaignStore`: selectedCampaignId, mode, tabIndex
- `entityStore`: visibleEntities[], pinnedEntities[], lockedEntities[]
- `chatStore`: messages[], contextRefs[]

---

## 🧪 Future Enhancements
- Versioning system for campaign data edits.
- Inline voice playback of AI-generated dialogue.
- Multi-DM collaboration per campaign with live cursors.

---

## 🛠️ Recommended Stack
| Layer            | Technology          |
|------------------|---------------------|
| Frontend         | React + Tailwind    |
| State Mgmt       | Zustand             |
| Graph Library    | Cytoscape.js        |
| Audio Streaming  | Agora.io or LiveKit |
| Backend / DB     | Supabase            |
| AI API           | OpenAI TTS / GPT-4o |
| Deployment       | Vercel / Netlify    |

---

This document defines the MVP UI structure and backend connections for Faux-Orator's campaign management system. Your programming team can iterate UI components using mock data first, then integrate with live Supabase entities and AI logic layer-by-layer.

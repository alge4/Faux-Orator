# 📝 Session Planning Chat Flow

## 🎯 Purpose
Enable Dungeon Masters to collaboratively plan gameplay sessions with AI support through an interactive chat interface. The system should:
- Surface database entries the AI references in real time.
- Allow DMs to inject their own selected content (NPCs, locations, factions, items, events) into the ongoing conversation.
- Guide DMs in producing actionable session plans, objectives, and narrative outlines.

---

## 💬 Chat Interface Features

### Core Functions:
- Natural language chat with AI.
- Receive AI-generated suggestions for session structure, pacing, and narrative progression.
- Inline editing of AI suggestions (accept, tweak, or reject).
- Quick-prompt buttons for recurring commands (e.g., "Suggest Encounter", "List Faction Goals").

### Context Awareness:
- AI responses include visible reference markers to NPCs, locations, and prior events.
- Highlighted text in responses shows which database entries were used.
- Hovering a reference displays a quick-glance preview.

---

## 📊 Context Panel (Sidebar)

### Dynamic Context Feed:
- Real-time list of referenced entries from the campaign database.
- Categorized by type: NPCs, Locations, Quests, Events, Items, Factions.
- Each entry can be expanded for summary, recent updates, and tags.

### Drag-and-Drop Interaction:
- Entries can be dragged directly into the chat input box.
- Doing so pins that entry into the current session planning context.
- AI re-evaluates its response with emphasis on newly pinned data.

### Search & Tag Filters:
- Quickly locate entries by name, tag, type, or relationship.
- Tag-based filters allow DMs to focus on relevant themes (e.g., "undead", "royalty", "chapter 3").

---

## 🧠 Session Plan Output

### Structured Session Object (auto-generated):
- **Title**: Session name
- **Summary**: AI-generated or edited overview
- **Objectives**: Key DM goals for the session (ex: introduce villain, reveal twist, stage battle)
- **Involved Entities**:
  - NPCs, Locations, Items, Factions
- **Story Beats**:
  - Expected event sequence or choices
  - Flexible branches based on player action
- **Tags**: Narrative theme (e.g., horror, diplomacy, heist), difficulty level, story arc

---

## 🧩 Integration Points
- Tightly integrated with Supabase for live data read/write.
- AI pulls from story and NPC memory using entity relationships.
- Session plans saved as discrete documents in the DM's campaign archive.

---

## ✨ UX Notes
- DM should always feel in control — AI suggestions must be editable.
- Context panel should be collapsible for mobile/tablet UX.
- Add "Session Timeline" preview toggle to visualize flow from a high level.

---

## 📷 Visual Mockup Sketch Description

Imagine a 3-column layout:

### Left Column – **Chat Panel**
- Top: DM input with dynamic text box
- Middle: Scrollable chat history with AI responses
- Each AI response shows inline references (e.g., [NPC: Lady Nyra])
- Bottom: Quick prompt buttons ("Add Encounter", "Insert Conflict", etc.)

### Center Column – **Session Plan Preview**
- Updates live as you plan
- Tabs: Summary, Objectives, Beats, Involved
- Inline editing and drag ordering for story beats

### Right Column – **Context Panel**
- Live feed of referenced entries
- Drag-and-drop enabled
- Search bar, filters, type icons
- Hover previews with links to deep edit/view

---

## 🗺️ Interactive Map Extension

- DMs can visualize interconnected NPCs, events, and story arcs as a network.
- Click nodes to expand context and timeline.
- Add/remove narrative links to simulate alternate paths.
- Recommended tech: Flourish Studio-style network visualizations.

This flow offers a collaborative workspace where AI and human creativity build structured, flexible plans for compelling D&D sessions.

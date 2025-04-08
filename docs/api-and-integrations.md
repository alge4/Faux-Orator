# API Documentation & External Integrations

## Supabase
- CRUD for story and character data
- RPC functions: `npc_generate_voice`, `add_story_arc_node`, etc.
- Auth and user roles

## OpenAI TTS
- POST `/v1/audio/speech`
- JSON:
```json
{
  "model": "tts-1-hd",
  "input": "Welcome, adventurers.",
  "voice": "fable"
}
```

## Agora.io
- Join voice channel on session start
- Play TTS mp3 streams
- Leave room on session end

## D&D Beyond
- OAuth or cobalt cookie
- Fetch characters, compendium content, spell/item data
- Caching layer for performance

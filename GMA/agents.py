import openai

class GameMastersAssistant:
    def __init__(self, api_key):
        openai.api_key = api_key
        self.story_agent = StoryAgent()
        self.lore_agent = LoreAgent()
        self.npc_agent = NPCAgent()

    def handle_message(self, message):
        # Simple routing logic to direct messages to appropriate agents
        if "story" in message.lower():
            return self.story_agent.get_idea()
        elif "lore" in message.lower():
            return self.lore_agent.get_info(message)
        elif "npc" in message.lower():
            return self.npc_agent.get_dialogue(message)
        return "I didn't understand that. Can you specify what you need help with (e.g., story, lore, npc)?"

class StoryAgent:
    def get_idea(self):
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a creative assistant."},
                {"role": "user", "content": "Generate a creative story idea for a DnD campaign."}
            ]
        )
        return response['choices'][0]['message']['content'].strip()

    # Example of a method that might be exposed to the user
    def get_custom_story(self, prompt):
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a creative assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        return response['choices'][0]['message']['content'].strip()

class LoreAgent:
    def get_info(self, topic):
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a knowledgeable assistant."},
                {"role": "user", "content": f"Provide detailed lore about {topic} in a DnD setting."}
            ]
        )
        return response['choices'][0]['message']['content'].strip()

class NPCAgent:
    def get_dialogue(self, npc_name):
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a creative assistant."},
                {"role": "user", "content": f"Create a dialogue for an NPC named {npc_name} in a DnD campaign."}
            ]
        )
        return response['choices'][0]['message']['content'].strip()

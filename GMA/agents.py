# gma/agents.py
import openai
from flask import current_app

class GameMastersAssistant:
    def __init__(self, api_key):
        openai.api_key = api_key
        self.story_agent = StoryAgent()
        self.lore_agent = LoreAgent()
        self.npc_agent = NPCAgent()
        self.rules_agent = RulesAgent()
        self.pc_agent = PCAgent()
        self.faction_agent = FactionAgent()
        self.below_table_agent = BelowTableAgent()

    def handle_message(self, message):
        # Simple routing logic to direct messages to appropriate agents
        if "story" in message.lower():
            return self.get_story_idea()
        elif "lore" in message.lower():
            return self.get_lore_info(message)
        elif "npc" in message.lower():
            return self.get_npc_dialogue(message)
        elif "rules" in message.lower():
            return self.get_rule_clarification(message)
        elif "pc" in message.lower():
            return self.get_pc_info(message)
        elif "faction" in message.lower():
            return self.get_faction_info(message)
        elif "custom story" in message.lower():
            return self.get_custom_story(message)
        return "I didn't understand that. Can you specify what you need help with (e.g., story, lore, npc)?"

    def get_story_idea(self):
        return self.story_agent.get_idea()

    def get_lore_info(self, topic):
        return self.lore_agent.get_info(topic)

    def get_npc_dialogue(self, npc_name):
        return self.npc_agent.get_dialogue(npc_name)

    def get_rule_clarification(self, query):
        return self.rules_agent.get_clarification(query)

    def get_pc_info(self, pc_name):
        return self.pc_agent.get_info(pc_name)

    def get_faction_info(self, faction_name):
        return self.faction_agent.get_info(faction_name)

    def get_custom_story(self, prompt):
        return self.story_agent.get_custom_story(prompt)

class StoryAgent:
    def get_idea(self):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": "Generate a creative story idea for a DnD campaign."}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

    def get_custom_story(self, prompt):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": prompt}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

class LoreAgent:
    def get_info(self, topic):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": f"Provide detailed lore about {topic} in a DnD setting."}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

class NPCAgent:
    def get_dialogue(self, npc_name):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": f"Create a dialogue for an NPC named {npc_name} in a DnD campaign."}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

class RulesAgent:
    def get_clarification(self, query):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": f"Provide clarification for the following rule: {query}."}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

class PCAgent:
    def get_info(self, pc_name):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": f"Provide the current status and background of the player character named {pc_name}."}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

class FactionAgent:
    def get_info(self, faction_name):
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": f"Provide the current status and outlook of the faction named {faction_name}."}],
            max_tokens=100
        )
        return response.choices[0].message['content'].strip()

class BelowTableAgent:
    def filter_information(self, info, recipients):
        # Implement filtering logic here
        pass

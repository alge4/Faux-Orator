#gma/ai.py
class GameMastersAssistant:
    def __init__(self):
        self.story_ai = StoryCreativeIdeasAI()
        self.rules_ai = DnD5eRulesLawyerAI()
        self.npc_ai = NPCManagerAI()
        self.lore_ai = LoreGuideAI()
    
    def get_story_idea(self):
        return self.story_ai.generate_idea()

    def get_rule_clarification(self, query):
        return self.rules_ai.clarify_rule(query)
    
    def get_npc_dialogue(self, npc_name):
        return self.npc_ai.get_dialogue(npc_name)
    
    def get_lore_info(self, topic):
        return self.lore_ai.get_info(topic)
    
    def update_configurations(self, configs):
        self.story_ai.update_config(configs)
        self.rules_ai.update_config(configs)
        self.npc_ai.update_config(configs)
        self.lore_ai.update_config(configs)
    
    def review_session(self, session_data):
        # Review and update session data
        pass

class StoryCreativeIdeasAI:
    def generate_idea(self):
        return "A mysterious stranger offers the party a quest."

class DnD5eRulesLawyerAI:
    def clarify_rule(self, query):
        return "According to page 75 of the Player's Handbook..."

class NPCManagerAI:
    def get_dialogue(self, npc_name):
        return f"{npc_name}: Welcome, adventurers!"

class LoreGuideAI:
    def get_info(self, topic):
        return f"The ancient city of {topic} is known for..."

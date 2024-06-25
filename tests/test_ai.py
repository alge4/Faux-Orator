import pytest
from gma.ai import GameMastersAssistant, StoryCreativeIdeasAI, DnD5eRulesLawyerAI, NPCManagerAI, LoreGuideAI

@pytest.fixture
def ai_assistant():
    return GameMastersAssistant()

def test_story_idea(ai_assistant):
    response = ai_assistant.get_story_idea()
    assert isinstance(response, str)
    assert "quest" in response.lower()

def test_rule_clarification(ai_assistant):
    response = ai_assistant.get_rule_clarification("spell casting")
    assert isinstance(response, str)
    assert "player's handbook" in response.lower()

def test_npc_dialogue(ai_assistant):
    response = ai_assistant.get_npc_dialogue("Bilbo")
    assert isinstance(response, str)
    assert "Bilbo" in response

def test_lore_info(ai_assistant):
    response = ai_assistant.get_lore_info("Shire")
    assert isinstance(response, str)
    assert "Shire" in response

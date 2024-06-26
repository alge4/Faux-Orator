import pytest
from gma.agents import GameMastersAssistant, StoryAgent, LoreAgent, NPCAgent, RulesAgent, PCAgent, FactionAgent

@pytest.fixture
def gma():
    return GameMastersAssistant(api_key="test_key")

def test_story_agent(gma):
    response = gma.get_story_idea()
    assert isinstance(response, str)
    assert len(response) > 0

def test_lore_agent(gma):
    response = gma.get_lore_info("Ancient City")
    assert isinstance(response, str)
    assert "ancient city" in response.lower()

def test_npc_agent(gma):
    response = gma.get_npc_dialogue("Gandalf")
    assert isinstance(response, str)
    assert "Gandalf" in response

def test_rules_agent(gma):
    response = gma.get_rule_clarification("What is the AC of a dragon?")
    assert isinstance(response, str)
    assert "page" in response.lower()

def test_pc_agent(gma):
    response = gma.get_pc_info("Thorin")
    assert isinstance(response, str)
    assert "Thorin" in response

def test_faction_agent(gma):
    response = gma.get_faction_info("Hobbiton Guard")
    assert isinstance(response, str)
    assert "Hobbiton Guard" in response

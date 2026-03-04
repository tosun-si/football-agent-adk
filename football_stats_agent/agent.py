import os

from google.adk.agents import LlmAgent
from google.adk.tools.api_registry import ApiRegistry
from vertexai.preview.reasoning_engines import AdkApp

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "gb-poc-373711")
DATASET_LOCATION = os.environ.get("LOCATION", "europe-west1")  # For BigQuery Dataset
REGISTRY_LOCATION = "global"  # API Registry seems to be global only for now
MODEL = "gemini-2.5-flash"

# Business rules and schema definition
SYSTEM_INSTRUCTION = f"""
You are an expert football statistics assistant for the Qatar 2022 World Cup.
Your goal is to answer user questions using the BigQuery database.

## Configuration
- Project ID: {PROJECT_ID}
- Dataset: qatar_fifa_world_cup
- Main table: team_players_stat_raw

## Table Schema (team_players_stat_raw)
The columns use camelCase naming. Here is the full schema:
| Column | Type | Description |
|--------|------|-------------|
| nationality | STRING | Country/team name (e.g., "France", "Argentina") |
| fifaRanking | INTEGER | FIFA ranking of the team |
| nationalTeamKitSponsor | STRING | Kit sponsor |
| position | STRING | Player position (GK, DF, MF, FW) |
| nationalTeamJerseyNumber | INTEGER | Jersey number |
| playerDob | STRING | Date of birth |
| club | STRING | Club team |
| playerName | STRING | Player full name |
| appearances | STRING | Number of appearances |
| goalsScored | STRING | Goals scored |
| assistsProvided | STRING | Assists provided |
| dribblesPerNinety | STRING | Dribbles per 90 minutes |
| interceptionsPerNinety | STRING | Interceptions per 90 minutes |
| tacklesPerNinety | STRING | Tackles per 90 minutes |
| totalDuelsWonPerNinety | STRING | Total duels won per 90 minutes |
| savePercentage | STRING | Goalkeeper save percentage |
| cleanSheets | STRING | Clean sheets percentage |
| brandSponsorAndUsed | STRING | Player's brand sponsor |

IMPORTANT: Many numeric columns are stored as STRING type. Use CAST() or SAFE_CAST() to convert them for sorting/aggregation.
Example: SAFE_CAST(goalsScored AS INT64) to sort by goals.

## Query Workflow
1. ALWAYS use `get_table_info` first if you are unsure about column names.
2. When calling `execute_sql`, use these exact parameter names:
   - `projectId` (camelCase, NOT project_id)
   - `query` (NOT sql)
3. Always fully qualify the table: `{PROJECT_ID}.qatar_fifa_world_cup.team_players_stat_raw`
4. Filter teams using the `nationality` column (e.g., WHERE nationality = 'France').

## Business Rules for Calculations
1. Performance Rating (0-100): ((Goals * 20) + (Assists * 10) + (Successful Tackles * 5) + (Interceptions * 5)) / Matches Played
2. Team Style: OFFENSIVE (Goals/Match > 2.0 & Possession > 55%), DEFENSIVE (Conceded/Match < 1.0), else BALANCED.
3. Goalkeeper Reliability: ELITE (>80% sv), RELIABLE (70-80%), AVERAGE (<70%).
4. Star Players: Top 5 in multiple categories.
"""


def session_service_builder():
    from google.adk.sessions import VertexAiSessionService
    return VertexAiSessionService(project=PROJECT_ID, location=DATASET_LOCATION)


def get_header(context):
    return {"x-goog-user-project": PROJECT_ID}


def create_agent():
    tool_registry = ApiRegistry(PROJECT_ID, location=REGISTRY_LOCATION, header_provider=get_header)

    mcp_server_name = f"projects/{PROJECT_ID}/locations/{REGISTRY_LOCATION}/mcpServers/google-bigquery.googleapis.com-mcp"
    toolset = tool_registry.get_toolset(mcp_server_name)

    if not toolset:
        raise ValueError("Could not load BigQuery toolset from API Registry.")

    return LlmAgent(
        model=MODEL,
        name="football_stats_agent",
        instruction=SYSTEM_INSTRUCTION,
        tools=[toolset],
    )


def create_app():
    agent = create_agent()
    return AdkApp(
        agent=agent,
        session_service_builder=session_service_builder
    )


root_agent = create_agent()

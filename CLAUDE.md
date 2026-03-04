# CLAUDE.md - Project Context for Claude Code

## Project Overview
Football statistics agent for the Qatar 2022 World Cup, built with Google Agent Development Kit (ADK) and BigQuery MCP via Cloud API Registry.

## Architecture
- **Framework**: Google ADK (`LlmAgent` from `google.adk.agents`)
- **Model**: `gemini-2.5-flash` via Vertex AI
- **Tool Access**: Cloud API Registry provides a managed MCP server for BigQuery (no local MCP server needed)
- **Deployment**: `adk web` for local dev, `Vertex AI Agent Engine` or `Cloud Run` for production
- **Entry Point**: `football_stats_agent.agent:root_agent` (see `agent_config.yaml`)
- **Agent package**: All agent logic lives in `football_stats_agent/agent.py`

## Project Structure
```
.
├── football_stats_agent/
│   ├── __init__.py       # Package init
│   └── agent.py          # Agent definition (Refactored for picklability)
├── webapp/                          # Next.js chat UI
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Main chat page
│   │   ├── globals.css              # Tailwind + football theme
│   │   └── api/
│   │       ├── cloud-run/route.ts   # Proxy to Cloud Run ADK API
│   │       └── agent-engine/route.ts # Proxy to FastAPI Agent Engine proxy
│   ├── components/
│   │   ├── ChatPage.tsx             # Main chat container
│   │   ├── ChatMessageList.tsx      # Scrollable message list
│   │   ├── ChatMessage.tsx          # Single message bubble
│   │   ├── ChatInput.tsx            # Input + send button
│   │   ├── BackendToggle.tsx        # Cloud Run / Agent Engine switch
│   │   └── Header.tsx               # App header
│   ├── hooks/
│   │   └── useChat.ts               # Chat state management
│   └── package.json
├── agent_engine_proxy/              # FastAPI proxy for Agent Engine
│   ├── main.py                      # /query endpoint
│   ├── Dockerfile                   # Multi-stage build with uv
│   ├── pyproject.toml               # Dependencies (uv-managed)
│   └── deploy.sh                    # Cloud Run deployment (uses Docker Bake)
├── diagrams/                        # Architecture diagrams
│   ├── adk_gcp_football_stats_agent.excalidraw
│   └── adk_gcp_football_stats_agent.png
├── deploy_agent_engine.sh           # Vertex AI Agent Engine deployment script (uses adk deploy CLI)
├── deploy_api.sh                    # Cloud Run deployment script (local, uses docker buildx)
├── deploy-services-to-cloud-run.yaml # Cloud Build CI/CD pipeline (bake + deploy all 3 services)
├── Dockerfile                       # ADK agent multi-stage build with uv
├── docker-bake.hcl                  # Docker Bake config (centralized builds + registry cache)
├── docker-compose.yaml              # Local dev runtime (all 3 services)
├── .dockerignore                    # Root Docker build context filter
├── .gcloudignore                    # Cloud Build source upload filter
├── agent_config.yaml     # ADK config (entry_point)
├── pyproject.toml        # Dependencies
├── .envrc                # Environment variables
├── .python-version       # Python 3.11.2
├── .gitignore            # Python ignores
├── uv.lock               # UV package lockfile
├── GEMINI.md             # Context file for Gemini-based AI assistants
└── CLAUDE.md             # This file
```

## Production Deployment

### 1. Vertex AI Agent Engine (Recommended)
Managed path using the `adk deploy agent_engine` CLI command. This handles agent serialization properly (avoids pickling issues with MCP toolsets) and enables the **Playground** in the console.
- **Command**: `./deploy_agent_engine.sh`
- **Resource Name**: `projects/975119474255/locations/europe-west1/reasoningEngines/8838921199133130752`
- **Console**: [Vertex AI Agent Engines Dashboard](https://console.cloud.google.com/vertex-ai/agents/agent-engines?project=gb-poc-373711)
- **How to Test**:
    - Go to the [Agent Engines Dashboard](https://console.cloud.google.com/vertex-ai/agents/agent-engines?project=gb-poc-373711).
    - Select the engine and use the **Playground** tab to interact with the agent.
- **Key Requirement**: The Reasoning Engine service account (`service-{PROJECT_NUMBER}@gcp-sa-aiplatform-re.iam.gserviceaccount.com`) needs **both** `roles/mcp.toolUser` (to call MCP tools) and `roles/cloudapiregistry.viewer` (to discover MCP servers in the API Registry). Without `cloudapiregistry.viewer`, the deployment fails with "MCP server not found".
- **Important**: Use `adk deploy agent_engine` instead of a custom Python deploy script. Custom scripts using `ReasoningEngine.create()` with `AdkApp` fail with pickling errors (`cannot pickle '_io.TextIOWrapper'`) due to MCP toolsets. The CLI handles serialization correctly and enables the Playground.

### 2. ADK API Server (Cloud Run)
Standard REST API path. Exposes agent endpoints via FastAPI.
- **Command**: `./deploy_api.sh`
- **How to Test**:
    - Open the Swagger UI at `https://football-stats-api-4wtmsxga6q-ew.a.run.app/docs`.
    - **Step 1**: Create a session:
      ```bash
      curl -X POST "https://football-stats-api-4wtmsxga6q-ew.a.run.app/apps/football_stats_agent/users/user123/sessions/session456" \
           -H "Content-Type: application/json" \
           -d '{}'
      ```
    - **Step 2**: Run the agent:
      ```bash
      curl -X POST "https://football-stats-api-4wtmsxga6q-ew.a.run.app/run" \
           -H "Content-Type: application/json" \
           -d '{
             "appName": "football_stats_agent",
             "userId": "user123",
             "sessionId": "session456",
             "newMessage": {
               "parts": [{"text": "Who is the best passer?"}]
             }
           }'
      ```
- **Container**: Multi-stage `Dockerfile` with uv, uses `adk api_server` and listens on **port 8080**.
- **Docs**: Swagger UI available at `/docs` endpoint.
- **Docker note**: The runtime stage uses `WORKDIR /agents` with the agent package at `/agents/football_stats_agent/` so ADK can discover it by convention. Do NOT copy `agent_config.yaml` into this path — it interferes with ADK's YAML loader.

## GCP Configuration
- **Project ID**: `gb-poc-373711`
- **BigQuery Dataset**: `qatar_fifa_world_cup`
- **BigQuery Table**: `team_players_stat_raw`
- **Dataset Location**: `europe-west1`
- **API Registry Location**: `global`

## IAM Permissions Required
The following roles must be granted to **both** the user and the **Service Accounts** (`{PROJECT_NUMBER}-compute@developer.gserviceaccount.com` and `service-{PROJECT_NUMBER}@gcp-sa-aiplatform-re.iam.gserviceaccount.com`):

| Role | Purpose |
|------|---------|
| `roles/mcp.toolUser` | Access to MCP tools via Cloud API Registry |
| `roles/cloudapiregistry.viewer` | Discover MCP servers in the API Registry |
| `roles/bigquery.dataViewer` | Read BQ data |
| `roles/bigquery.jobUser` | Run BQ queries |
| `roles/aiplatform.user` | Call Vertex AI models and Reasoning Engine |
| `roles/storage.objectAdmin` | Manage staging bucket for deployment |

## Table Schema (team_players_stat_raw)
Columns use **camelCase** naming (NOT snake_case). This is critical — using snake_case causes BigQuery errors that the MCP server reports as connection closures.

| Column | Type | Description |
|--------|-------------|-----------------------------------|
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

**Important**: Many numeric columns are stored as `STRING`. Use `SAFE_CAST()` for sorting/aggregation (e.g., `SAFE_CAST(goalsScored AS INT64)`).

## Development Tools
- **uv**: Python package manager used to install dependencies and run the app
- **direnv**: Automatically loads/unloads environment variables and the virtual environment when entering/leaving the project directory via `.envrc`
- **GCP Application Default Credentials (ADC)**: Required for local authentication to GCP services

## Environment Variables (managed by direnv via .envrc)
The `.envrc` file exports all env vars (including webapp backend URLs) and creates/activates the virtual environment automatically:
```bash
GCP_PROJECT_ID=gb-poc-373711
BIGQUERY_DATASET=qatar_fifa_world_cup
BIGQUERY_TABLE=team_players_stat_raw
GOOGLE_GENAI_USE_VERTEXAI=True
LOCATION=europe-west1

# Webapp backend URLs (used by Next.js API routes via process.env)
CLOUD_RUN_API_URL=https://football-stats-api-4wtmsxga6q-ew.a.run.app
AGENT_ENGINE_PROXY_URL=https://agent-engine-proxy-975119474255.europe-west1.run.app
```

## Setup and Running the Agent

### 1. Allow direnv to load the environment
```bash
direnv allow
```
This will automatically:
- Create the `.venv` virtual environment via `uv venv` (if it doesn't exist)
- Activate the virtual environment
- Export all required environment variables

### 2. Install dependencies
```bash
uv sync
```

### 3. Authenticate with GCP (Application Default Credentials)
```bash
gcloud auth application-default login
```

### 4. Run the agent locally
```bash
uv run adk web
```

## Key Code Patterns
- `create_agent()`: Initializes API Registry, fetches BigQuery toolset, creates `LlmAgent`
- `create_app()`: Wraps agent in `AdkApp` for Vertex AI Agent Engine deployment
- `root_agent`: Module-level agent instance exposed for `adk web`
- `SYSTEM_INSTRUCTION`: Contains full table schema and business rules to guide SQL generation
- MCP server name format: `projects/{PROJECT_ID}/locations/{REGISTRY_LOCATION}/mcpServers/google-bigquery.googleapis.com-mcp`

## Business Rules for Calculations
1.  **Performance Rating** (0-100): `((Goals * 20) + (Assists * 10) + (Tackles * 5) + (Interceptions * 5)) / Matches`
2.  **Team Style**: OFFENSIVE (Goals/Match > 2.0 & Possession > 55%), DEFENSIVE (Conceded/Match < 1.0), else BALANCED
3.  **Goalkeeper Reliability**: ELITE (>80% save), RELIABLE (70-80%), AVERAGE (<70%)
4.  **Star Players**: Top 5 in multiple categories

## Known Issues
- **"Attempted to exit cancel scope in a different task" warning on shutdown**: Known issue in ADK/MCP library async cleanup. Harmless, does not affect functionality.

## Troubleshooting
- **McpError: Connection closed**: Check IAM roles and camelCase column names.
- **ValueError: MCP server not found**: Ensure the Service Account has both `roles/mcp.toolUser` and `roles/cloudapiregistry.viewer`. Use project **number** vs **ID** in the resource string as a fallback.
- **cannot pickle '_io.TextIOWrapper'**: Use `adk deploy agent_engine` CLI instead of custom Python deploy scripts. The CLI handles MCP toolset serialization correctly and enables the Playground.
- **Cloud Run Port**: Cloud Run expects the container to listen on `8080`.
- **adk api_server arguments**: Use `adk api_server` without `--app` in the CMD to automatically pick up `agent_config.yaml`.

## Local Development with Docker Compose

Docker Compose runs all 3 services locally with GCP credentials mounted from the host.

### Build all images
```bash
docker buildx bake
```

### Run all services
```bash
docker compose up
```

### Services
| Service | Local URL | Port Mapping |
|---------|-----------|-------------|
| ADK Agent (Cloud Run API) | `http://localhost:8080` | 8080:8080 |
| Agent Engine Proxy | `http://localhost:8081` | 8081:8080 |
| Webapp | `http://localhost:3000` | 3000:3000 |

### Test locally
```bash
# ADK API (Swagger UI)
curl http://localhost:8080/docs

# Agent Engine Proxy
curl http://localhost:8081/health

# Webapp
open http://localhost:3000
```

### GCP credentials
Docker Compose mounts `~/.config/gcloud` read-only into the Python containers. The `GOOGLE_CLOUD_PROJECT` env var is set so Vertex AI can resolve the project from ADC.

## Docker Bake (Centralized Builds)

`docker-bake.hcl` defines all 3 build targets with Artifact Registry tags and **registry-based cache**. Docker Compose also uses it automatically.

```bash
# Build all images
docker buildx bake

# Build a single target
docker buildx bake adk-agent
docker buildx bake agent-engine-proxy
docker buildx bake webapp
```

### Targets and image tags
| Target | Image Tag | Cache Tag |
|--------|-----------|-----------|
| `adk-agent` | `.../football-stats-api:latest` | `.../football-stats-api:cache` |
| `agent-engine-proxy` | `.../agent-engine-proxy:latest` | `.../agent-engine-proxy:cache` |
| `webapp` | `.../football-stats-webapp:latest` | `.../football-stats-webapp:cache` |

All tags are prefixed with `europe-west1-docker.pkg.dev/gb-poc-373711/internal-images`.

### Registry cache
Each target uses `cache-from` and `cache-to` with `type=registry` and `mode=max` (caches all layers, not just final). This allows CI/CD pipelines (Cloud Build) to reuse layers across runs, significantly speeding up builds when only application code changes.

### Local deploy scripts
Both `deploy_api.sh` and `agent_engine_proxy/deploy.sh` build for `linux/amd64` with `docker buildx build --platform linux/amd64 --push`, then `gcloud run deploy`. These are for manual deployments from Apple Silicon machines.

## CI/CD with Cloud Build

`deploy-services-to-cloud-run.yaml` is the Cloud Build pipeline that builds all images, deploys all 3 services to Cloud Run, and deploys the agent to Vertex AI Agent Engine.

### Pipeline steps
1. **Build & push** (`gcr.io/cloud-builders/docker`) — `docker buildx bake --push` builds all 3 images with registry cache and pushes to Artifact Registry
2. **Deploy Cloud Run** (`google-cloud-cli:stable`) — Deploys all 3 services in a single step:
   - `football-stats-api` with BigQuery/Vertex AI env vars
   - `agent-engine-proxy` with project/location env vars
   - `football-stats-webapp` dynamically fetches ADK API and Proxy URLs from deployed services
3. **Deploy Agent Engine** (`uv:python3.11-alpine`) — `uv sync` + `adk deploy agent_engine` to deploy the agent to Vertex AI Agent Engine

### Run the pipeline
```bash
gcloud builds submit --config deploy-services-to-cloud-run.yaml --project gb-poc-373711
```

### Substitution variables
| Variable | Default | Description |
|----------|---------|-------------|
| `_REGION` | `europe-west1` | Cloud Run and Artifact Registry region |
| `_REGISTRY` | `europe-west1-docker.pkg.dev/${PROJECT_ID}/internal-images` | Artifact Registry path |
| `PROJECT_ID` | (from gcloud) | GCP project ID |

### Source upload filter
`.gcloudignore` excludes unnecessary files from `gcloud builds submit` uploads: `.git`, `.venv`, `node_modules`, `.next`, IDE files, docs, and local config. Keeps only what Docker Bake needs (Dockerfiles, source code, lock files, `docker-bake.hcl`).

## Dockerfiles (Multi-stage Builds with uv)

All Python services use multi-stage builds: **builder** (install deps with uv + cache mounts) then **runtime** (slim image, copy only `.venv`).

- **Root `Dockerfile`** (ADK agent): Builder installs from `uv.lock` with `--frozen`. Runtime uses `WORKDIR /agents` so ADK discovers the agent package by convention.
- **`agent_engine_proxy/Dockerfile`**: Builder installs from `pyproject.toml`. Runtime copies `.venv` + `main.py`.
- **`webapp/Dockerfile`**: 3-stage Next.js build (deps -> builder -> standalone runner). Requires `output: "standalone"` in `next.config.ts`.

## Web App (Next.js Chat UI)

### Setup (without Docker)
```bash
cd webapp
npm install
npm run dev
```
Opens at `http://localhost:3000`. Toggle between **Cloud Run** and **Agent Engine** backends in the UI.

### Configuration
Backend URLs are managed via `.envrc` (direnv) at the project root — no `.env.local` needed. Next.js API routes read them from `process.env`:
- `CLOUD_RUN_API_URL` — Cloud Run ADK API endpoint
- `AGENT_ENGINE_PROXY_URL` — Agent Engine proxy endpoint

When running with Docker Compose, these are overridden by the `environment` block in `docker-compose.yaml` (using container networking).

### Docker
The webapp uses `output: "standalone"` in `next.config.ts` for optimized Docker images. The `.dockerignore` excludes `node_modules`, `.next`, and `.env*.local`.

## Agent Engine Proxy (FastAPI)

Small FastAPI proxy that wraps the Vertex AI `ReasoningEngine.stream_query()` API. Managed with uv via its own `pyproject.toml`.

### Run locally (without Docker)
```bash
cd agent_engine_proxy
uv run uvicorn main:app --port 8080
```

### Deploy to Cloud Run
```bash
cd agent_engine_proxy
./deploy.sh
```

After deployment, update `AGENT_ENGINE_PROXY_URL` in `.envrc` with the Cloud Run URL and run `direnv allow`.

### Known behavior
The Agent Engine streaming API may send a final `{"code": 498, "message": "Connection closed"}` event after a successful response (MCP cleanup). The proxy ignores this if a response was already collected.

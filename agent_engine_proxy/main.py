import asyncio
import json
import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import aiplatform_v1beta1
from pydantic import BaseModel

logger = logging.getLogger(__name__)

app = FastAPI(title="Agent Engine Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

LOCATION = os.environ.get("LOCATION", "europe-west1")
PROJECT_NUMBER = os.environ.get("PROJECT_NUMBER", "975119474255")
ENGINE_ID = os.environ.get("ENGINE_ID", "8838921199133130752")
RESOURCE_NAME = (
    f"projects/{PROJECT_NUMBER}/locations/{LOCATION}/reasoningEngines/{ENGINE_ID}"
)
USER_ID = "proxy-user"
MAX_RETRIES = 3

client = aiplatform_v1beta1.ReasoningEngineExecutionServiceClient(
    client_options={"api_endpoint": f"{LOCATION}-aiplatform.googleapis.com"}
)


class QueryRequest(BaseModel):
    message: str


class QueryResponse(BaseModel):
    response: str


def _call_agent(message: str) -> str:
    """Call the Agent Engine via streaming API and return the response text."""
    stream_request = aiplatform_v1beta1.types.StreamQueryReasoningEngineRequest(
        name=RESOURCE_NAME,
        class_method="async_stream_query",
        input={"message": message, "user_id": USER_ID},
    )

    response_text = ""
    for event in client.stream_query_reasoning_engine(
        request=stream_request, timeout=120
    ):
        if not event.data:
            continue
        data = json.loads(event.data.decode("utf-8"))
        if "code" in data:
            error_msg = data.get("message", "Agent Engine error")
            if not response_text:
                raise ConnectionError(error_msg)
            break
        content = data.get("content", {})
        for part in content.get("parts", []):
            if isinstance(part, dict) and part.get("text"):
                response_text = part["text"]

    return response_text


@app.post("/query", response_model=QueryResponse)
async def query_agent(request: QueryRequest):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            text = _call_agent(request.message)
            return QueryResponse(response=text or "No response from agent")
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            is_retryable = "connection closed" in error_str or "mcp" in error_str or "500" in error_str
            if not is_retryable or attempt == MAX_RETRIES:
                logger.error("Attempt %d/%d failed (non-retryable): %s", attempt, MAX_RETRIES, e)
                break
            logger.warning("Attempt %d/%d failed: %s — retrying in %ds...", attempt, MAX_RETRIES, e, attempt * 5)
            await asyncio.sleep(attempt * 5)

    raise HTTPException(status_code=502, detail=str(last_error))


@app.get("/health")
async def health():
    return {"status": "ok"}

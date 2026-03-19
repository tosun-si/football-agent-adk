variable "PROJECT_ID" {
  default = "gb-poc-373711"
}

variable "LOCATION" {
  default = "europe-west1"
}

variable "REPO_NAME" {
  default = "internal-images"
}

variable "REGISTRY" {
  default = "${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
}

group "default" {
  targets = ["adk-agent", "agent-engine-proxy", "webapp"]
}

target "adk-agent" {
  context    = "."
  dockerfile = "Dockerfile"
  tags = ["${REGISTRY}/football-stats-api:latest"]
  cache-from = ["type=registry,ref=${REGISTRY}/football-stats-api:cache"]
  cache-to = ["type=registry,ref=${REGISTRY}/football-stats-api:cache,mode=max"]
}

target "agent-engine-proxy" {
  context    = "./agent_engine_proxy"
  dockerfile = "Dockerfile"
  tags = ["${REGISTRY}/agent-engine-proxy:latest"]
  cache-from = ["type=registry,ref=${REGISTRY}/agent-engine-proxy:cache"]
  cache-to = ["type=registry,ref=${REGISTRY}/agent-engine-proxy:cache,mode=max"]
}

target "webapp" {
  context    = "./webapp"
  dockerfile = "Dockerfile"
  tags = ["${REGISTRY}/football-stats-webapp:latest"]
  cache-from = ["type=registry,ref=${REGISTRY}/football-stats-webapp:cache"]
  cache-to = ["type=registry,ref=${REGISTRY}/football-stats-webapp:cache,mode=max"]
}

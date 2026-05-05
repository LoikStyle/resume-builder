#!/usr/bin/env bash
set -Eeuo pipefail

HOST="43.156.46.230"
PORT="2222"
USER_NAME="root"
KEY="/Users/believe/Downloads/macos.pem"

LOCAL_LOG="/Users/believe/Desktop/网站claude/resume-builder/coze-bootstrap-local.log"
REMOTE_LOG="/root/coze-studio-bootstrap.log"
REMOTE_INSTALL_LOG="/root/coze-studio-install.log"

mkdir -p "$(dirname "$LOCAL_LOG")"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOCAL_LOG"
}

SSH_BASE=(
  ssh
  -F /dev/null
  -p "$PORT"
  -i "$KEY"
  -o IdentitiesOnly=yes
  -o BatchMode=yes
  -o PreferredAuthentications=publickey
  -o PasswordAuthentication=no
  -o KbdInteractiveAuthentication=no
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=90
  -o ConnectionAttempts=1
  -o ServerAliveInterval=20
  -o ServerAliveCountMax=3
  "$USER_NAME@$HOST"
)

ssh_with_timeout() {
  local limit_seconds="$1"
  shift

  "${SSH_BASE[@]}" "$@" &
  local ssh_pid=$!

  (
    sleep "$limit_seconds"
    kill -TERM "$ssh_pid" 2>/dev/null || true
    sleep 2
    kill -KILL "$ssh_pid" 2>/dev/null || true
  ) &
  local watchdog_pid=$!

  local rc
  set +e
  wait "$ssh_pid"
  rc=$?
  set -e

  kill "$watchdog_pid" 2>/dev/null || true
  wait "$watchdog_pid" 2>/dev/null || true

  return "$rc"
}

wait_for_ssh() {
  local attempt
  for attempt in $(seq 1 180); do
    log "SSH check attempt ${attempt}/180"
    local rc
    set +e
    ssh_with_timeout 150 'date >/dev/null' >>"$LOCAL_LOG" 2>&1
    rc=$?
    set -e
    if [ "$rc" -eq 0 ]; then
      log "SSH is available"
      return 0
    fi
    log "SSH check failed with rc=$rc; retrying in 60s"
    sleep 60
  done
  log "SSH did not become available after retries"
  return 1
}

run_remote_bootstrap_with_retry() {
  local attempt rc
  for attempt in $(seq 1 20); do
    log "remote bootstrap attempt ${attempt}/20"
    set +e
    run_remote_bootstrap >>"$LOCAL_LOG" 2>&1
    rc=$?
    set -e
    if [ "$rc" -eq 0 ]; then
      return 0
    fi
    log "remote bootstrap failed with rc=$rc; retrying in 60s"
    sleep 60
  done
  return 1
}

run_remote_bootstrap() {
  "${SSH_BASE[@]}" 'bash -s' <<'REMOTE'
set -Eeuo pipefail

REMOTE_LOG="/root/coze-studio-bootstrap.log"
INSTALL_LOG="/root/coze-studio-install.log"

exec > >(tee -a "$REMOTE_LOG") 2>&1

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

find_workdir_from_labels() {
  local name dir
  for name in coze-web coze-server coze-mysql coze-redis coze-elasticsearch; do
    dir="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' "$name" 2>/dev/null || true)"
    if [ -n "$dir" ] && [ "$dir" != "<no value>" ] && [ -f "$dir/Makefile" ]; then
      printf '%s\n' "$dir"
      return 0
    fi
  done
  return 1
}

find_workdir_from_disk() {
  find /root /opt /srv -maxdepth 4 -type f -path '*/coze-studio/Makefile' 2>/dev/null \
    | sed 's#/Makefile$##' \
    | head -n 1
}

ensure_env() {
  local env_file="$1/docker/.env"
  if [ ! -f "$env_file" ]; then
    log "docker/.env missing; copying docker/.env.example"
    cp "$1/docker/.env.example" "$env_file"
  fi

  if grep -q '^export WEB_LISTEN_ADDR=' "$env_file"; then
    sed -i.bak 's#^export WEB_LISTEN_ADDR=.*#export WEB_LISTEN_ADDR="0.0.0.0:8888"#' "$env_file"
  else
    printf '\nexport WEB_LISTEN_ADDR="0.0.0.0:8888"\n' >>"$env_file"
  fi
}

log "remote bootstrap started"
hostname || true
uptime || true
free -h || true
df -h / || true

command -v git
command -v docker
docker compose version

log "current Coze containers"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | grep -E 'coze|opencoze' || true

running_install="$(pgrep -fa 'make web|docker compose.*coze-studio|docker compose.*docker-compose.yml' || true)"
if [ -n "$running_install" ]; then
  log "existing Coze install/start command detected; not launching a duplicate"
  printf '%s\n' "$running_install"
  exit 0
fi

workdir="$(find_workdir_from_labels || true)"
if [ -z "$workdir" ]; then
  workdir="$(find_workdir_from_disk || true)"
fi

if [ -z "$workdir" ]; then
  log "coze-studio source not found; cloning official repository"
  cd /root
  git clone --depth 1 https://github.com/coze-dev/coze-studio.git
  workdir="/root/coze-studio"
else
  log "using existing coze-studio workdir: $workdir"
fi

cd "$workdir"
ensure_env "$workdir"

if docker ps --format '{{.Names}}' | grep -qx 'coze-web' \
  && docker ps --format '{{.Names}}' | grep -qx 'coze-server'; then
  log "coze-web and coze-server are already running"
  docker compose -f docker/docker-compose.yml --env-file docker/.env ps || true
else
  log "starting Coze Studio with make web in background"
  nohup bash -lc "cd '$workdir' && make web" >"$INSTALL_LOG" 2>&1 &
  log "remote make web pid: $!"
fi

log "remote bootstrap finished"
REMOTE
}

poll_http() {
  local attempt status
  for attempt in $(seq 1 120); do
    status="$(curl -sS -o /tmp/coze-studio-probe.html -w '%{http_code}' --max-time 12 "http://${HOST}:8888/" 2>>"$LOCAL_LOG" || true)"
    log "HTTP probe attempt ${attempt}/120: ${status:-curl-failed}"
    case "$status" in
      200|301|302|304|401|403)
        log "Coze Studio HTTP endpoint is responding at http://${HOST}:8888/"
        return 0
        ;;
    esac
    sleep 30
  done
  log "Coze Studio HTTP endpoint did not become ready during polling"
  return 1
}

main() {
  : >"$LOCAL_LOG"
  log "Coze Studio bootstrap worker started"
  log "local key: $KEY"
  wait_for_ssh
  log "running remote bootstrap"
  run_remote_bootstrap_with_retry
  log "remote bootstrap command returned"
  poll_http || true
  log "local worker finished; remote logs: $REMOTE_LOG and $REMOTE_INSTALL_LOG"
}

main "$@"

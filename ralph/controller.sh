#!/bin/bash

#############################################################################
# Ralph Wiggum - Autonomous Development Controller
# "I'm helping!" - Ralph Wiggum
#
# This script orchestrates autonomous development tasks for Boss of Clean.
# It reads tasks from PRD.json, executes them via Claude, validates changes,
# and generates reports.
#############################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PRD_FILE="$SCRIPT_DIR/PRD.json"
AGENTS_FILE="$SCRIPT_DIR/agents.md"
REPORTS_DIR="$SCRIPT_DIR/reports"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"

# Read config from PRD.json
MAX_TASKS=$(jq -r '.config.maxTasksPerRun' "$PRD_FILE")
TIME_CAP_MINUTES=$(jq -r '.config.timeCapMinutes' "$PRD_FILE")
COMMIT_PREFIX=$(jq -r '.config.commitPrefix' "$PRD_FILE")
BUILD_CMD=$(jq -r '.config.buildCommand' "$PRD_FILE")
LINT_CMD=$(jq -r '.config.lintCommand' "$PRD_FILE")
MAX_RETRIES=$(jq -r '.config.maxRetries // 3' "$PRD_FILE")
RETRY_COOLDOWN_HOURS=$(jq -r '.config.retryCooldownHours // 24' "$PRD_FILE")

# Parse command line arguments
DRY_RUN=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run|--dry_run|-n)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dry-run, -n    Show what would be executed without running"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Runtime variables
START_TIME=$(date +%s)
TASKS_COMPLETED=0
TASKS_FAILED=0
REPORT_DATE=$(date +%Y-%m-%d)
REPORT_TIME=$(date +%H-%M-%S)
REPORT_FILE="$REPORTS_DIR/${REPORT_DATE}_${REPORT_TIME}.md"
LOG_FILE="$REPORTS_DIR/${REPORT_DATE}_${REPORT_TIME}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#############################################################################
# Utility Functions
#############################################################################

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" ;;
        OK)    echo -e "${GREEN}[OK]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
    esac

    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

check_time_cap() {
    local current_time=$(date +%s)
    local elapsed=$(( (current_time - START_TIME) / 60 ))

    if [ $elapsed -ge $TIME_CAP_MINUTES ]; then
        log WARN "Time cap of ${TIME_CAP_MINUTES} minutes reached"
        return 1
    fi
    return 0
}

get_elapsed_time() {
    local current_time=$(date +%s)
    echo $(( (current_time - START_TIME) / 60 ))
}

#############################################################################
# Task Management
#############################################################################

get_next_pending_task() {
    local cooldown_seconds=$(( RETRY_COOLDOWN_HOURS * 3600 ))
    local now=$(date +%s)

    jq -r --argjson max_retries "$MAX_RETRIES" \
           --argjson cooldown "$cooldown_seconds" \
           --argjson now "$now" '
        .tasks
        | map(select(
            .status == "pending"
            or (
                .status == "failed"
                and ((.retry_count // 0) < $max_retries)
                and ((.failed_at // 0) + $cooldown <= $now)
            )
        ))
        | sort_by(.priority | if . == "high" then 0 elif . == "medium" then 1 else 2 end)
        | first
        | .id // empty
    ' "$PRD_FILE"
}

get_task_details() {
    local task_id=$1
    jq -r --arg id "$task_id" '.tasks[] | select(.id == $id)' "$PRD_FILE"
}

update_task_status() {
    local task_id=$1
    local new_status=$2

    local tmp_file=$(mktemp)

    if [ "$new_status" = "failed" ]; then
        local now=$(date +%s)
        jq --arg id "$task_id" --arg status "$new_status" --argjson now "$now" '
            .tasks = [.tasks[] | if .id == $id then
                .status = $status
                | .retry_count = ((.retry_count // 0) + 1)
                | .failed_at = $now
            else . end]
        ' "$PRD_FILE" > "$tmp_file"
    elif [ "$new_status" = "in-progress" ]; then
        jq --arg id "$task_id" --arg status "$new_status" '
            .tasks = [.tasks[] | if .id == $id then
                .status = $status
            else . end]
        ' "$PRD_FILE" > "$tmp_file"
    else
        jq --arg id "$task_id" --arg status "$new_status" '
            .tasks = [.tasks[] | if .id == $id then
                .status = $status
                | del(.retry_count, .failed_at)
            else . end]
        ' "$PRD_FILE" > "$tmp_file"
    fi

    mv "$tmp_file" "$PRD_FILE"
    log INFO "Task $task_id status updated to: $new_status"
}

#############################################################################
# Build & Validation
#############################################################################

run_build() {
    log INFO "Running build: $BUILD_CMD"

    cd "$PROJECT_DIR"
    if $BUILD_CMD >> "$LOG_FILE" 2>&1; then
        log OK "Build passed"
        return 0
    else
        log ERROR "Build failed"
        return 1
    fi
}

run_lint() {
    log INFO "Running lint: $LINT_CMD"

    cd "$PROJECT_DIR"
    if $LINT_CMD >> "$LOG_FILE" 2>&1; then
        log OK "Lint passed"
        return 0
    else
        log WARN "Lint warnings/errors (non-blocking)"
        return 0  # Non-blocking for now
    fi
}

run_smoke_tests() {
    log INFO "Running Playwright smoke tests..."

    cd "$PROJECT_DIR"

    # Run smoke tests with chromium only, headless
    if npx playwright test tests/smoke.spec.ts --project=chromium --reporter=line >> "$LOG_FILE" 2>&1; then
        log OK "Smoke tests passed"
        return 0
    else
        log ERROR "SMOKE TEST FAILURE - Check $LOG_FILE for details"
        return 1
    fi
}

validate_changes() {
    log INFO "Validating changes..."

    if ! run_build; then
        return 1
    fi

    run_lint

    # Run smoke tests after successful build
    if ! run_smoke_tests; then
        log ERROR "Smoke tests failed - blocking deployment"
        return 1
    fi

    return 0
}

#############################################################################
# Claude Integration
#############################################################################

build_task_prompt() {
    local task_json=$1

    local task_id=$(echo "$task_json" | jq -r '.id')
    local title=$(echo "$task_json" | jq -r '.title')
    local description=$(echo "$task_json" | jq -r '.description')
    local files=$(echo "$task_json" | jq -r '.files | join(", ")')
    local criteria=$(echo "$task_json" | jq -r '.acceptanceCriteria | map("- " + .) | join("\n")')

    cat <<EOF
You are Ralph, an autonomous development agent for Boss of Clean.

## Your Task: $task_id - $title

$description

## Files to modify/create:
$files

## Acceptance Criteria:
$criteria

## Instructions:
1. Read the relevant existing files first
2. Implement the required changes
3. Follow the coding conventions in ralph/agents.md
4. Use commit prefix: "$COMMIT_PREFIX"
5. After implementation, the build will be validated automatically

## Important:
- Do NOT modify .env files
- Do NOT make destructive database changes
- Do NOT force push or rebase
- Keep changes focused on this task only

Begin implementation now.
EOF
}

execute_task() {
    local task_id=$1
    local task_json=$(get_task_details "$task_id")

    local retry_count=$(echo "$task_json" | jq -r '.retry_count // 0')

    log INFO "Executing task: $task_id"
    log INFO "Title: $(echo "$task_json" | jq -r '.title')"
    if [ "$retry_count" -gt 0 ]; then
        log WARN "Retry attempt $retry_count/$MAX_RETRIES"
    fi

    # Update status to in-progress
    update_task_status "$task_id" "in-progress"

    # Build the prompt
    local prompt=$(build_task_prompt "$task_json")

    # Create a temporary prompt file
    local prompt_file=$(mktemp)
    echo "$prompt" > "$prompt_file"

    # Execute Claude with the task
    cd "$PROJECT_DIR"

    local task_start=$(date +%s)

    if claude --dangerously-skip-permissions -p "$(cat "$prompt_file")" >> "$LOG_FILE" 2>&1; then
        local task_end=$(date +%s)
        local task_duration=$(( task_end - task_start ))

        log OK "Claude completed task in ${task_duration}s"

        # Validate the changes
        if validate_changes; then
            update_task_status "$task_id" "done"
            log OK "Task $task_id completed successfully"
            TASKS_COMPLETED=$((TASKS_COMPLETED + 1))
            rm "$prompt_file"
            return 0
        else
            update_task_status "$task_id" "failed"
            log ERROR "Task $task_id failed validation"
            TASKS_FAILED=$((TASKS_FAILED + 1))
            rm "$prompt_file"
            return 1
        fi
    else
        update_task_status "$task_id" "failed"
        log ERROR "Claude execution failed for task $task_id"
        TASKS_FAILED=$((TASKS_FAILED + 1))
        rm "$prompt_file"
        return 1
    fi
}

#############################################################################
# Report Generation
#############################################################################

generate_report() {
    local elapsed=$(get_elapsed_time)
    local end_time=$(date '+%Y-%m-%d %H:%M:%S')

    cat > "$REPORT_FILE" <<EOF
# Ralph Development Report

**Date**: $REPORT_DATE
**Started**: $(date -d "@$START_TIME" '+%Y-%m-%d %H:%M:%S')
**Ended**: $end_time
**Duration**: ${elapsed} minutes

---

## Summary

| Metric | Value |
|--------|-------|
| Tasks Attempted | $((TASKS_COMPLETED + TASKS_FAILED)) |
| Tasks Completed | $TASKS_COMPLETED |
| Tasks Failed | $TASKS_FAILED |
| Time Used | ${elapsed}/${TIME_CAP_MINUTES} min |

---

## Tasks Processed

EOF

    # Add details for each processed task
    jq -r '
        .tasks[]
        | select(.status == "done" or .status == "failed" or .status == "in-progress")
        | "### \(.id): \(.title)\n**Status**: \(.status)\n**Priority**: \(.priority)\n\n"
    ' "$PRD_FILE" >> "$REPORT_FILE"

    cat >> "$REPORT_FILE" <<EOF

---

## Pending Tasks

EOF

    # List remaining pending tasks
    jq -r '
        .tasks[]
        | select(.status == "pending")
        | "- **\(.id)**: \(.title) (\(.priority))"
    ' "$PRD_FILE" >> "$REPORT_FILE"

    cat >> "$REPORT_FILE" <<EOF

---

## Notes

- Build command: \`$BUILD_CMD\`
- Lint command: \`$LINT_CMD\`
- Full log: \`${LOG_FILE}\`

---

*Generated by Ralph Wiggum Autonomous Development Controller*
EOF

    log OK "Report generated: $REPORT_FILE"
}

#############################################################################
# Main Execution Loop
#############################################################################

main() {
    echo ""
    echo "=============================================="
    echo "  Ralph Wiggum - Autonomous Development"
    echo "  \"I'm helping!\""
    echo "=============================================="
    echo ""

    # Initialize log file
    echo "Ralph Development Session - $REPORT_DATE $REPORT_TIME" > "$LOG_FILE"
    echo "================================================" >> "$LOG_FILE"

    # Check prerequisites
    if ! command -v claude &> /dev/null; then
        log ERROR "Claude CLI not found. Please install it first."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log ERROR "jq not found. Please install it: apt install jq"
        exit 1
    fi

    if [ ! -f "$PRD_FILE" ]; then
        log ERROR "PRD.json not found at $PRD_FILE"
        exit 1
    fi

    log INFO "Configuration:"
    log INFO "  Max tasks per run: $MAX_TASKS"
    log INFO "  Time cap: $TIME_CAP_MINUTES minutes"
    log INFO "  Commit prefix: $COMMIT_PREFIX"
    log INFO "  Max retries: $MAX_RETRIES (cooldown: ${RETRY_COOLDOWN_HOURS}h)"
    echo ""

    # Dry run mode - show what would be executed
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}=== DRY RUN MODE ===${NC}"
        echo ""
        echo "Would execute up to $MAX_TASKS tasks:"
        echo ""

        local count=0
        while IFS= read -r task_line; do
            if [ $count -ge $MAX_TASKS ]; then
                break
            fi
            local task_id=$(echo "$task_line" | jq -r '.id')
            local title=$(echo "$task_line" | jq -r '.title')
            local priority=$(echo "$task_line" | jq -r '.priority')
            local est_mins=$(echo "$task_line" | jq -r '.estimatedMinutes')
            local files=$(echo "$task_line" | jq -r '.files | join(", ")')
            local criteria_count=$(echo "$task_line" | jq -r '.acceptanceCriteria | length')

            echo -e "${BLUE}[$((count + 1))] $task_id${NC}: $title"
            echo "    Priority: $priority | Est: ${est_mins}min | Criteria: $criteria_count"
            echo "    Files: $files"
            echo ""
            count=$((count + 1))
        done < <(jq -c '.tasks | map(select(.status == "pending")) | sort_by(.priority | if . == "high" then 0 elif . == "medium" then 1 else 2 end) | .[]' "$PRD_FILE")

        echo "---"
        echo "Total pending tasks: $(jq '[.tasks[] | select(.status == "pending")] | length' "$PRD_FILE")"
        echo "Tasks by status:"
        echo "  - pending: $(jq '[.tasks[] | select(.status == "pending")] | length' "$PRD_FILE")"
        echo "  - in-progress: $(jq '[.tasks[] | select(.status == "in-progress")] | length' "$PRD_FILE")"
        echo "  - done: $(jq '[.tasks[] | select(.status == "done")] | length' "$PRD_FILE")"
        echo "  - failed: $(jq '[.tasks[] | select(.status == "failed")] | length' "$PRD_FILE")"
        echo ""
        echo "Run without --dry-run to execute."
        exit 0
    fi

    # Main task execution loop
    local tasks_attempted=0

    while [ $tasks_attempted -lt $MAX_TASKS ]; do
        # Check time cap
        if ! check_time_cap; then
            log WARN "Stopping due to time cap"
            break
        fi

        # Get next pending task
        local next_task=$(get_next_pending_task)

        if [ -z "$next_task" ]; then
            log INFO "No more pending tasks"
            break
        fi

        echo ""
        log INFO "========== Task $((tasks_attempted + 1))/$MAX_TASKS =========="

        # Execute the task
        if execute_task "$next_task"; then
            log OK "Task completed successfully"
        else
            log ERROR "Task failed - continuing to next task"
        fi

        tasks_attempted=$((tasks_attempted + 1))

        echo ""
    done

    # Generate final report
    echo ""
    log INFO "Generating report..."
    generate_report

    echo ""
    echo "=============================================="
    echo "  Session Complete"
    echo "  Tasks: $TASKS_COMPLETED completed, $TASKS_FAILED failed"
    echo "  Report: $REPORT_FILE"
    echo "=============================================="
    echo ""
}

# Run main function
main "$@"

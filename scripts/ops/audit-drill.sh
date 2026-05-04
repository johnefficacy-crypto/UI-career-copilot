#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ADMIN_ALERT_WEBHOOK_URL:-}" ]]; then
  echo "ADMIN_ALERT_WEBHOOK_URL is not set" >&2
  exit 1
fi

TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
mkdir -p artifacts/ops
cat > artifacts/ops/audit-drill-$TS.txt <<EOF
Audit Drill Timestamp: $TS
Webhook URL configured: yes
Step 1: In staging, revoke insert on admin_audit_logs for app role temporarily.
Step 2: Trigger critical action: publish_recruitment.
Step 3: Verify app log includes [audit-failure].
Step 4: Verify webhook receives payload source=admin_action_audit.
Step 5: Restore permissions and re-run action to verify alert silence.
EOF

echo "Created artifact checklist at artifacts/ops/audit-drill-$TS.txt"

# Ops rollout checklist

- [ ] Set `ADMIN_ALERT_WEBHOOK_URL` in dev
- [ ] Set `ADMIN_ALERT_WEBHOOK_URL` in staging
- [ ] Set `ADMIN_ALERT_WEBHOOK_URL` in prod
- [ ] Run `npm run ops:audit-drill` in staging runtime
- [ ] Attach app log + webhook payload + timestamp artifact to release ticket

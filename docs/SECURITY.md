# Security Notes — Boss of Clean

## Rate Limit Cleanup Scheduler

The `rate_limits` table stores one row per (identifier, endpoint) pair and
grows as new IPs/users hit rate-limited endpoints. A helper RPC already exists
to prune stale rows:

```sql
SELECT cleanup_expired_rate_limits();
```

This deletes rows whose `window_start` is older than twice the window duration
(i.e. rows that can never affect future rate-limit decisions).

### Recommended schedule

Call `cleanup_expired_rate_limits()` **once per day** via one of:

1. **n8n cron workflow** (preferred — already in the stack)
   - Trigger: Schedule node, daily at 03:00 ET
   - Action: Supabase node → Execute SQL → `SELECT cleanup_expired_rate_limits();`

2. **pg_cron** (if enabled on the Supabase project)
   ```sql
   SELECT cron.schedule(
     'cleanup-rate-limits',
     '0 7 * * *',          -- 07:00 UTC = 03:00 ET
     $$SELECT cleanup_expired_rate_limits();$$
   );
   ```

Without regular cleanup the table will grow unbounded, though performance
impact is minimal since lookups are indexed on `(identifier, endpoint)`.

# Collection engine (Package 2)

Scheduled and paid execution are **off**. No cron or route calls this code.

## Before it can run against Supabase

1. Migration `supabase/migrations/20261126000700_collection_bridge.sql` grants the private trigger helpers to `service_role` and exposes narrow public wrappers. The proposed SQL file is not applied separately.
2. Paid work calls `appradar_collection_ensure_budgets` with `DAILY_LIMIT_USD` and `MONTHLY_LIMIT_USD`. Missing limits fail closed. An existing period is not raised.
3. Copy `config.example.json`, set `retentionDays`, targets and frequencies.
4. Environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN`; paid work also needs
   `APIFY_COLLECTION_ENABLED=true`, `POC_DATA_USE_CONFIRMED=true`, `COLLECTION_PAID_EXECUTION=true`.

## Commands

```sh
node --import tsx src/lib/collection/cli.ts plan --config my.json                 # dry run, no DB, no network
node --import tsx src/lib/collection/cli.ts enqueue --provider aurelix --mode charts --config my.json --execute
node --env-file=.env --import tsx src/lib/collection/cli.ts work --max-jobs 1 --config my.json --execute   # PAID
node --env-file=.env --import tsx src/lib/collection/cli.ts reconcile --execute
```

`work` takes the **oldest due jobs** in the queue, not a job you name. `--new-window` repeats a target that was
already collected in the current frequency window. `scheduleDue()` is the hook for a future cron and does nothing
while `schedulingEnabled` is false.

## Behaviour

- Order: pending run → budget reservation → committed start ticket → one POST → record external id.
- A start without a recorded id becomes `unknown`: reservation held, target blocked, never re-posted.
- A confirmed zero (usage 0 and an all-zero charge breakdown) can settle. A missing amount and a positive reported amount stay reserved. Elapsed time is not evidence. `resolve --decision confirm_cost` settles only with operator evidence and does not release the reservation.
- `resolve --decision confirm_absent` releases a reservation only when the start is unknown and still has no external id. `attach_run` records an id and does not start another paid run. Neither decision retries automatically.
- Retries: only an actor `FAILED`/`TIMED-OUT` run (next attempt, new reservation) and a daily budget stop.
  After a successful paid run, ingest errors resume the same run; they never requeue.
- Empty, mostly invalid or unusable datasets fail. Truncated, below-expected or partly invalid ones are `partial`.
  A charge-cap stop is `partial`. Usage that is missing or not below the cap leaves search, chart, developer, review and keyword coverage uncertain, so those jobs are not `succeeded`.

## Test

`collection.test.ts` header explains the disposable-PostgreSQL scenarios. Apify is faked.

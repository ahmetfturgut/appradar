// Optional local PostgreSQL/WASM validation; no project dependency or remote DB.
// node --import tsx supabase/tests/run-catalog.mjs /absolute/path/to/pglite/dist/index.js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeItem, ObservationSchema } from '../../src/poc/normalize.ts';
import { Job, stableHash } from '../../src/poc/plan.ts';

if (process.argv.length !== 3) throw new Error('Pass the absolute PGlite module path; no dependency is installed automatically.');
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href);
const db = new PGlite();
try {
  // Disposable Supabase role fixture, not part of the deployment migration.
  await db.exec('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;');
  const migration = await readFile(new URL('../migrations/20261126000100_catalog_core.sql', import.meta.url), 'utf8');
  await db.transaction(tx => tx.exec(migration));
  const sql = await readFile(new URL('./catalog.sql', import.meta.url), 'utf8');
  const results = await db.exec(sql);
  const assertions = results.flatMap(result => result.rows.filter(row => typeof row.passed === 'string'));
  assert.ok(assertions.length > 0, 'Expected SQL assertions');
  assert.equal(assertions.length, (sql.match(/\bas passed;/g) ?? []).length, 'Every SQL assertion must run');
  const empty = await db.query('select count(*)::integer as rows from public.apps');
  assert.equal(empty.rows[0].rows, 0, 'SQL tests must roll back test data');
  let normalizedRows = 0;
  // Contract checks only, not an importer: real redacted source samples are
  // re-normalized in memory and the entire SQL transaction is rolled back.
  await db.exec('begin');
  for (const file of ['subimpact-ios-search-habit-tracker.json', 'subimpact-play-search-habit-tracker.json',
    'subimpact-play-charts-topfree.json', 'aurelix-ios-charts-topfree-6007.json',
    'aurelix-ios-developers-570060151.json', 'aurelix-play-developers-6957685454452609502.json',
    'datatrail-ios-new-free-apps-6007.json']) {
    const fixture = JSON.parse(await readFile(new URL(`../../tests/fixtures/${file}`, import.meta.url), 'utf8'));
    const values = { ...fixture.job, requestedLanguage: 'en', round: 1, expectedIds: [], maxResults: 100, maxChargeUsd: 0.05 };
    const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
    for (const raw of fixture.redactedSamples) {
      const result = normalizeItem(raw, job, fixture.run.id, '2026-11-26T12:00:00.000Z');
      assert.equal(result.kind, 'valid', file);
      const o = ObservationSchema.parse(result.observation);
      const canonicalUrl = o.store === 'ios' ? `https://apps.apple.com/app/id${o.storeAppId}`
        : `https://play.google.com/store/apps/details?id=${o.storeAppId}`;
      const app = await db.query(`insert into public.apps (store,store_app_id,canonical_url,first_seen_at,last_seen_at)
        values ($1,$2,$3,$4,$4) on conflict (store,store_app_id) do update set last_seen_at=excluded.last_seen_at returning id`,
      [o.store,o.storeAppId,canonicalUrl,o.collectedAt]);
      const listing = await db.query(`insert into public.app_listings (app_id,store,country,requested_language,first_seen_at,expires_at)
        values ($1,$2,$3,$4,$5,$6) on conflict (app_id,country,requested_language) do update set last_observed_at=$5 returning id`,
      [app.rows[0].id,o.store,o.country,o.requestedLanguage,o.collectedAt,'2026-11-27T12:00:00Z']);
      // Fixture-only fingerprint; production content/series derivation belongs to T4.
      const inserted = await db.query(`insert into public.app_snapshots (
        listing_id,store,source,source_run_id,source_build,schema_version,idempotency_key,payload_hash,content_hash,series_key,
        effective_language,observation_role,collection_mode,collection_context,collection_category,rank,
        observed_at,observed_time_basis,collected_at,version,released_at,released_at_precision,
        store_updated_at,store_updated_at_precision,price_amount,currency,is_free,rating_value,
        rating_count,review_count,installs_text,installs_lower_bound,field_status,expires_at)
        values (${Array.from({ length: 34 }, (_, i) => `$${i + 1}`).join(',')}) returning id`,
      [listing.rows[0].id,o.store,o.source,o.sourceRunId,o.sourceBuild,o.schemaVersion,o.idempotencyKey,o.payloadHash,
        stableHash({ rating: o.ratingValue, count: o.ratingCount, version: o.version }),`${o.source}/v2`,
        o.language,o.observationRole,o.collectionContext.mode,o.collectionContext.context,o.collectionContext.category,o.rank,
        o.observedAt,o.observedTimeBasis,o.collectedAt,o.version,o.releasedAt,o.releasedAtPrecision,
        o.listingUpdatedAt,o.listingUpdatedAtPrecision,o.priceAmount,o.currency,o.isFree,o.ratingValue,
        o.ratingCount,o.reviewCount,o.installsText,o.installsLowerBound,JSON.stringify(o.fieldStatus),'2026-11-27T12:00:00Z']);
      assert.equal(inserted.rows.length, 1);
      normalizedRows++;
    }
  }
  await db.exec('rollback');
  assert.equal((await db.query('select count(*)::integer as rows from public.apps')).rows[0].rows, 0);
  const version = await db.query('show server_version');
  console.log(JSON.stringify({ status: 'WORKING', engine: 'PGlite', postgres: version.rows[0].server_version,
    sqlAssertions: assertions.length, normalizedFixtureRows: normalizedRows, testDataRolledBack: true }));
} finally {
  await db.close();
}

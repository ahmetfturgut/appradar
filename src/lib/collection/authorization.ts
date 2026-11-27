// Scoped data-use authorization. Owner/operator approval is never treated as a third-party licence.
import type { CollectionConfig, Schedule, Target } from "./config.ts";

export type ThirdPartyRightsStatus = "verified" | "unconfirmed" | "prohibited";

/** Explicit unconfirmed pilot scopes. Missing/unknown → B4.3 details-only bounds. */
export type InternalPilotScope = "b43-details" | "b45-productivity";

export function internalPilotScope(env: Record<string, string | undefined>): InternalPilotScope {
  return env.APPRADAR_INTERNAL_PILOT_SCOPE?.trim() === "b45-productivity" ? "b45-productivity" : "b43-details";
}

/** Explicit status only. Missing/unknown values fail closed. */
export function thirdPartyRightsStatus(env: Record<string, string | undefined>): ThirdPartyRightsStatus | null {
  const value = env.APPRADAR_THIRD_PARTY_RIGHTS_STATUS?.trim();
  if (value === "verified" || value === "unconfirmed" || value === "prohibited") return value;
  return null;
}

/** Public commercial display is a separate future gate; default closed. */
export function publicCommercialDisplayAuthorized(env: Record<string, string | undefined>): boolean {
  return env.APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED === "true";
}

function usEnOnly(target: Target, reasons: string[]) {
  if (target.country !== "US") reasons.push("internal_pilot_us_only");
  if ((target.language ?? "en") !== "en") reasons.push("internal_pilot_en_only");
}

/**
 * B4.3 bounds for the unconfirmed-rights internal pilot path.
 * Kept intact: expanded B4.5 work cannot use this path without the B4.5 scope + approvals.
 */
export function internalPilotBoundViolations(config: CollectionConfig): string[] {
  const reasons: string[] = [];
  if (config.schedulingEnabled) reasons.push("internal_pilot_scheduling_forbidden");
  if (config.maxAttempts !== 1) reasons.push("internal_pilot_retries_forbidden");
  if (config.retentionDays !== 30) reasons.push("internal_pilot_retention_must_be_30");
  if (config.schedules.length !== 1) reasons.push("internal_pilot_schedule_count");
  const schedule = config.schedules[0];
  if (!schedule || schedule.provider !== "aurelix" || schedule.mode !== "details") {
    reasons.push("internal_pilot_aurelix_details_only");
    return reasons;
  }
  if (schedule.targets.length === 0 || schedule.targets.length > 2) reasons.push("internal_pilot_max_two_targets");
  let listings = 0;
  for (const target of schedule.targets) {
    usEnOnly(target, reasons);
    const ids = target.appIds ?? [];
    if (ids.length === 0) reasons.push("internal_pilot_app_ids_required");
    listings += ids.length;
  }
  if (listings === 0 || listings > 6) reasons.push("internal_pilot_max_six_listings");
  return [...new Set(reasons)];
}

const B45_DISCOVERY: ReadonlyArray<{ provider: Schedule["provider"]; mode: Schedule["mode"] }> = [
  { provider: "aurelix", mode: "charts" },
  { provider: "subimpact", mode: "charts" },
  { provider: "datatrail", mode: "charts" },
];

function b45DiscoveryTargetOk(schedule: Schedule, target: Target, reasons: string[]) {
  usEnOnly(target, reasons);
  if (schedule.provider === "aurelix" && schedule.mode === "charts") {
    if (target.store !== "ios" || target.chart !== "topFree" || target.category !== "6007") {
      reasons.push("b45_aurelix_ios_topfree_6007_required");
    }
    if ((target.maxResults ?? 0) !== 50) reasons.push("b45_aurelix_chart_maxResults_must_be_50");
    return;
  }
  if (schedule.provider === "subimpact" && schedule.mode === "charts") {
    if (target.store !== "play" || target.chart !== "topFree" || target.category !== "PRODUCTIVITY") {
      reasons.push("b45_subimpact_play_topfree_productivity_required");
    }
    if ((target.maxResults ?? 0) !== 50) reasons.push("b45_subimpact_chart_maxResults_must_be_50");
    return;
  }
  if (schedule.provider === "datatrail" && schedule.mode === "charts") {
    if (target.store !== "ios" || target.chart !== "newFreeApps" || target.category !== "6007") {
      reasons.push("b45_datatrail_ios_newfree_6007_required");
    }
    if ((target.maxResults ?? 0) !== 10) reasons.push("b45_datatrail_chart_maxResults_must_be_10");
  }
}

function b45DetailsOk(schedule: Schedule, reasons: string[]) {
  if (schedule.provider !== "aurelix" || schedule.mode !== "details") {
    reasons.push("b45_details_aurelix_only");
    return;
  }
  if (schedule.targets.length === 0 || schedule.targets.length > 2) reasons.push("b45_details_max_two_targets");
  let listings = 0;
  const stores = new Set<string>();
  for (const target of schedule.targets) {
    usEnOnly(target, reasons);
    if (target.store !== "ios" && target.store !== "play") reasons.push("b45_details_store_invalid");
    if (stores.has(target.store)) reasons.push("b45_details_one_target_per_store");
    stores.add(target.store);
    const ids = target.appIds ?? [];
    if (ids.length === 0) reasons.push("b45_details_app_ids_required");
    if (ids.length > 50) reasons.push("b45_details_max_fifty_ids_per_store");
    listings += ids.length;
  }
  // Chart coverage prioritized (≤50/store). Total detail listings capped at 100.
  if (listings === 0 || listings > 100) reasons.push("b45_details_max_one_hundred_listings");
}

/**
 * B4.5 Productivity pilot bounds. Separate from B4.3; requires dedicated B4.5 approvals.
 * Accepts discovery-only, details-only, or full discovery+details configs.
 */
export function b45ProductivityPilotBoundViolations(config: CollectionConfig): string[] {
  const reasons: string[] = [];
  if (config.schedulingEnabled) reasons.push("internal_pilot_scheduling_forbidden");
  if (config.maxAttempts !== 1) reasons.push("internal_pilot_retries_forbidden");
  if (config.retentionDays !== 30) reasons.push("internal_pilot_retention_must_be_30");

  const schedules = config.schedules;
  if (schedules.length === 0 || schedules.length > 4) {
    reasons.push("b45_schedule_count");
    return [...new Set(reasons)];
  }

  const keys = schedules.map(s => `${s.provider}/${s.mode}`);
  if (new Set(keys).size !== keys.length) reasons.push("b45_duplicate_provider_mode");

  const discovery = schedules.filter(s => B45_DISCOVERY.some(d => d.provider === s.provider && d.mode === s.mode));
  const details = schedules.filter(s => s.provider === "aurelix" && s.mode === "details");
  const other = schedules.filter(s => !discovery.includes(s) && !details.includes(s));
  if (other.length) reasons.push("b45_unsupported_provider_mode");

  const discoveryOnly = discovery.length === 3 && details.length === 0 && schedules.length === 3;
  const detailsOnly = discovery.length === 0 && details.length === 1 && schedules.length === 1;
  const full = discovery.length === 3 && details.length === 1 && schedules.length === 4;
  if (!discoveryOnly && !detailsOnly && !full) reasons.push("b45_schedule_shape_invalid");

  if (discovery.length && discovery.length !== 3) reasons.push("b45_discovery_must_be_all_three");
  for (const want of B45_DISCOVERY) {
    const schedule = discovery.find(s => s.provider === want.provider && s.mode === want.mode);
    if (!schedule) {
      if (discovery.length) reasons.push(`b45_missing_${want.provider}_${want.mode}`);
      continue;
    }
    if (schedule.targets.length !== 1) reasons.push(`b45_${want.provider}_one_target`);
    for (const target of schedule.targets) b45DiscoveryTargetOk(schedule, target, reasons);
  }

  for (const schedule of details) b45DetailsOk(schedule, reasons);

  // Hard Actor-start ceiling for the full Productivity pilot: 3 discovery + ≤2 detail targets.
  if (full) {
    const detailTargets = details[0]?.targets.length ?? 0;
    if (3 + detailTargets > 5) reasons.push("b45_max_five_actor_starts");
  }

  return [...new Set(reasons)];
}

/**
 * Data-use authorization reasons. Distinct from paid-execution / budget gates.
 *
 * Paths:
 * - verified → requires POC_DATA_USE_CONFIRMED=true (evidence-backed third-party rights)
 * - unconfirmed → requires operator approval + separate unconfirmed-risk acceptance + pilot bounds
 * - prohibited → always blocked
 *
 * POC_DATA_USE_CONFIRMED without status=verified is rejected (no false confirmation).
 * B4.5 Productivity needs additional scope + approvals; it does not widen B4.3 bounds.
 */
export function dataUseAuthorizationClosed(
  env: Record<string, string | undefined>,
  config: CollectionConfig,
): string[] {
  const reasons: string[] = [];
  const status = thirdPartyRightsStatus(env);
  const confirmed = env.POC_DATA_USE_CONFIRMED === "true";
  const operatorApproval = env.APPRADAR_INTERNAL_PILOT_OPERATOR_APPROVAL === "true";
  const riskAccepted = env.APPRADAR_INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED === "true";

  if (status === null) {
    reasons.push("third_party_rights_status_missing");
    if (confirmed) reasons.push("POC_DATA_USE_CONFIRMED_requires_verified_rights");
    return reasons;
  }
  if (status === "prohibited") {
    reasons.push("third_party_rights_prohibited");
    return reasons;
  }
  if (confirmed && status !== "verified") {
    reasons.push("POC_DATA_USE_CONFIRMED_requires_verified_rights");
  }

  if (status === "verified") {
    if (!confirmed) reasons.push("POC_DATA_USE_CONFIRMED_not_true");
    return reasons;
  }

  // unconfirmed: internal pilot only; never represents verified third-party permission.
  if (!operatorApproval) reasons.push("INTERNAL_PILOT_OPERATOR_APPROVAL_not_true");
  if (!riskAccepted) reasons.push("INTERNAL_PILOT_UNCONFIRMED_RISK_ACCEPTED_not_true");

  const scope = internalPilotScope(env);
  if (scope === "b45-productivity") {
    if (env.APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL !== "true") {
      reasons.push("INTERNAL_PILOT_B45_PRODUCTIVITY_OPERATOR_APPROVAL_not_true");
    }
    if (env.APPRADAR_INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED !== "true") {
      reasons.push("INTERNAL_PILOT_B45_PRODUCTIVITY_UNCONFIRMED_RISK_ACCEPTED_not_true");
    }
    reasons.push(...b45ProductivityPilotBoundViolations(config));
  } else {
    reasons.push(...internalPilotBoundViolations(config));
  }
  return reasons;
}

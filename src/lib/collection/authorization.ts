// Scoped data-use authorization. Owner/operator approval is never treated as a third-party licence.
import type { CollectionConfig } from "./config.ts";

export type ThirdPartyRightsStatus = "verified" | "unconfirmed" | "prohibited";

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

/**
 * Bounds for the unconfirmed-rights internal pilot path only.
 * Prevents that path from becoming a generic paid-collection bypass.
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
    if (target.country !== "US") reasons.push("internal_pilot_us_only");
    if ((target.language ?? "en") !== "en") reasons.push("internal_pilot_en_only");
    const ids = target.appIds ?? [];
    if (ids.length === 0) reasons.push("internal_pilot_app_ids_required");
    listings += ids.length;
  }
  if (listings === 0 || listings > 6) reasons.push("internal_pilot_max_six_listings");
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
  reasons.push(...internalPilotBoundViolations(config));
  return reasons;
}

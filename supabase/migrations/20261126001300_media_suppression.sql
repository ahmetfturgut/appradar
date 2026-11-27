-- B4.2: app-level media display suppression. Survives collection refreshes.
-- Display gates also require env flags + provider eligibility; this never grants rights.
-- Apply after 0012. service_role only; no client grants.

alter table public.apps
  add column icons_suppressed_at timestamptz check (icons_suppressed_at is null or isfinite(icons_suppressed_at)),
  add column screenshots_suppressed_at timestamptz check (screenshots_suppressed_at is null or isfinite(screenshots_suppressed_at));

comment on column public.apps.icons_suppressed_at is
  'When set, icon URLs are withheld from all read paths even if APPRADAR_STORE_ICONS_ENABLED=true. Collection may still refresh icon_url.';
comment on column public.apps.screenshots_suppressed_at is
  'When set, screenshot URLs are withheld from all read paths even if APPRADAR_STORE_SCREENSHOTS_ENABLED=true. Collection may still refresh screenshot_urls.';

-- Operator/tooling only. Does not delete listing media; display suppression only.
create or replace function public.appradar_set_media_suppression(
  p_app_id uuid,
  p_suppress_icons boolean,
  p_suppress_screenshots boolean
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.apps%rowtype;
begin
  if p_app_id is null then
    raise exception 'app_id_required' using errcode = '22023';
  end if;
  update public.apps
  set
    icons_suppressed_at = case when p_suppress_icons then coalesce(icons_suppressed_at, v_now) else null end,
    screenshots_suppressed_at = case when p_suppress_screenshots then coalesce(screenshots_suppressed_at, v_now) else null end
  where id = p_app_id
  returning * into v_row;
  if not found then
    raise exception 'app_not_found' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'app_id', v_row.id,
    'icons_suppressed_at', v_row.icons_suppressed_at,
    'screenshots_suppressed_at', v_row.screenshots_suppressed_at
  );
end;
$$;

revoke all on function public.appradar_set_media_suppression(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.appradar_set_media_suppression(uuid, boolean, boolean) to service_role;

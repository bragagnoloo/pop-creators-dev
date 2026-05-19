-- =============================================================================
-- 0017 — Agenda de publicação: múltiplas plataformas + sugestão de legenda
-- =============================================================================
-- Antes: publication_platform text (uma plataforma só)
-- Agora: publication_platforms text[] (várias) + publication_caption text
-- A coluna publication_platform fica mantida (deprecated) por compat retroativa
-- e é sincronizada como o primeiro item do array.

-- -----------------------------------------------------------------------------
-- 1. Novas colunas
-- -----------------------------------------------------------------------------

alter table campaign_deliveries
  add column if not exists publication_platforms text[] not null default '{}',
  add column if not exists publication_caption text;

-- Backfill: copia publication_platform (deprecated) pra array, se houver
update campaign_deliveries
   set publication_platforms = array[publication_platform]
 where publication_platform is not null
   and (publication_platforms is null or array_length(publication_platforms, 1) is null);

-- -----------------------------------------------------------------------------
-- 2. RPC: set_publication_schedule aceita array de plataformas + legenda opcional
-- -----------------------------------------------------------------------------
-- Drop da assinatura antiga (parameter types mudaram) e cria a nova.

drop function if exists set_publication_schedule(uuid, timestamptz, text);

create or replace function set_publication_schedule(
  p_delivery_id uuid,
  p_date timestamptz,
  p_platforms text[],
  p_caption text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_d campaign_deliveries%rowtype;
  v_platforms text[];
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_date is null then raise exception 'date_required'; end if;
  if p_platforms is null or array_length(p_platforms, 1) is null then
    raise exception 'platforms_required';
  end if;

  -- Sanitiza: remove vazias, faz trim
  v_platforms := array(
    select distinct trim(p) from unnest(p_platforms) as p
     where p is not null and length(trim(p)) > 0
  );
  if array_length(v_platforms, 1) is null then
    raise exception 'platforms_required';
  end if;

  select * into v_d from campaign_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'delivery_not_found'; end if;
  if not can_manage_campaign(v_d.campaign_id) then raise exception 'not_authorized'; end if;
  if v_d.deliverable_status <> 'approved' then raise exception 'deliverable_not_approved'; end if;
  if exists (
    select 1 from applications
    where campaign_id = v_d.campaign_id and user_id = v_d.user_id and disqualified_at is not null
  ) then raise exception 'participant_disqualified'; end if;

  update campaign_deliveries
     set publication_date = p_date,
         publication_platforms = v_platforms,
         publication_platform = v_platforms[1],  -- sync com legacy
         publication_caption = nullif(trim(coalesce(p_caption, '')), '')
   where id = p_delivery_id;

  return jsonb_build_object(
    'delivery_id', p_delivery_id,
    'publication_date', p_date,
    'publication_platforms', v_platforms,
    'publication_caption', nullif(trim(coalesce(p_caption, '')), '')
  );
end;
$$;

revoke all on function set_publication_schedule(uuid, timestamptz, text[], text) from public;
grant execute on function set_publication_schedule(uuid, timestamptz, text[], text) to authenticated;

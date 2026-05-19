-- =============================================================================
-- 0018 — Publication URLs por plataforma (mapa JSONB)
-- =============================================================================
-- Quando admin agenda múltiplas plataformas, o criador precisa colar 1 URL
-- por plataforma. Antes: publication_url text (uma só). Agora: publication_urls
-- jsonb com { "Instagram": "https://...", "TikTok": "https://..." }.
-- publication_url permanece (deprecated) como espelho da primeira plataforma.

-- -----------------------------------------------------------------------------
-- 1. Nova coluna
-- -----------------------------------------------------------------------------

alter table campaign_deliveries
  add column if not exists publication_urls jsonb not null default '{}'::jsonb;

-- Backfill: copia publication_url (legado) pra dentro do mapa usando a primeira
-- plataforma como chave. Se não houver plataforma, ignora.
update campaign_deliveries
   set publication_urls = jsonb_build_object(publication_platforms[1], publication_url)
 where publication_url is not null
   and length(publication_url) > 0
   and publication_platforms is not null
   and array_length(publication_platforms, 1) > 0
   and (publication_urls is null or publication_urls = '{}'::jsonb);

-- -----------------------------------------------------------------------------
-- 2. Atualiza o trigger guard para permitir criador atualizar publication_urls
-- -----------------------------------------------------------------------------
-- (a coluna entra na lista de campos editáveis pelo owner; outros campos
-- admin-only continuam revertidos)

create or replace function a_guard_delivery_owner_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id = auth.uid() and not can_manage_campaign(new.campaign_id) then
    -- Imutáveis: identidade da row e datas de criação
    new.id                       := old.id;
    new.created_at               := old.created_at;
    new.campaign_id              := old.campaign_id;
    new.user_id                  := old.user_id;
    new.index                    := old.index;
    -- Campos controlados pelo admin
    new.scheduled_date           := old.scheduled_date;
    new.deliverable_status       := old.deliverable_status;
    new.revision_note            := old.revision_note;
    new.revision_due_date        := old.revision_due_date;
    new.publication_status       := old.publication_status;
    new.publication_date         := old.publication_date;
    new.publication_platform     := old.publication_platform;
    new.publication_platforms    := old.publication_platforms;
    new.publication_caption      := old.publication_caption;
    new.publication_due_date     := old.publication_due_date;
    new.publication_confirmed_at := old.publication_confirmed_at;
    new.reviewed_at              := old.reviewed_at;
    new.reviewed_by              := old.reviewed_by;
    -- Permitido pelo criador: content_url, publication_url, publication_urls
  end if;
  return new;
end;
$$;

-- =============================================================================
-- 0036 — Correção travada: criador ficava sem campo para enviar a URL corrigida
-- =============================================================================
--
-- Sintoma: com uma rodada de correção aberta, o admin via "Aguardando URL
-- corrigida do criador" e o criador não via campo nenhum para responder.
--
-- Causa: o trigger reset_deliverable_on_url_change (0015) é de quando a correção
-- era reenviada editando a própria content_url. A 0016 substituiu isso por
-- rodadas com campo próprio (campaign_delivery_revisions.revised_url) e trigger
-- próprio, mas o antigo nunca foi removido. Quem estava com a página aberta
-- ANTES do pedido de correção ainda enxergava o campo da entrega original;
-- ao salvar ali, o trigger rebaixava deliverable_status de 'needs_revision' para
-- 'pending' e zerava revision_note/revision_due_date. Depois disso os dois campos
-- da tela do criador ficavam ocultos ao mesmo tempo — o original porque já existe
-- revisão, o da correção porque depende do status.
--
-- Seguro remover: o estado que o trigger tenta consertar não existe mais por
-- desenho. 'needs_revision' só é escrito por request_delivery_revision e
-- 'needs_resubmit' por request_publication_revision, e ambas criam a rodada
-- junto. Verificado no banco antes desta migration:
--     entregas em needs_revision  sem linha de revisão: 0
--     entregas em needs_resubmit  sem linha de revisão: 0
--
-- O bloco de publicação do mesmo trigger foi substituído pela 0017 e já era
-- inalcançável pela interface; sai junto, por simetria.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remove o trigger legado
-- -----------------------------------------------------------------------------

drop trigger if exists trg_reset_deliverable_on_url_change on campaign_deliveries;
drop function if exists reset_deliverable_on_url_change();

-- -----------------------------------------------------------------------------
-- 2. Guard: criador não altera a entrega original com correção aberta
--
--    Fecha a porta que o trigger acima abria. Mesmo com uma aba antiga carregada
--    ou com um PATCH direto no PostgREST, content_url deixa de mudar enquanto
--    houver rodada pendente — o campo da correção passa a ser o único caminho.
--
--    Função recriada por inteiro a partir da versão vigente (0018); a única
--    diferença é o bloco novo no fim.
-- -----------------------------------------------------------------------------

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

    -- NOVO: com rodada de correção aberta, a entrega original fica congelada.
    -- A resposta vai em campaign_delivery_revisions.revised_url.
    if exists (
      select 1 from campaign_delivery_revisions r
      where r.delivery_id = new.id
        and r.revised_url is null
        and r.approved_at is null
    ) then
      new.content_url := old.content_url;
    end if;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';

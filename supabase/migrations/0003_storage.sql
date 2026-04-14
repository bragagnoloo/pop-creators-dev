-- =============================================================================
-- Storage buckets + policies
-- =============================================================================

-- Buckets (public = GET liberado sem auth, útil pra servir imagens em <img>)

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('campaign-logos', 'campaign-logos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('lesson-thumbnails', 'lesson-thumbnails', true)
  on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- avatars: cada usuário faz upload em avatars/<user_id>/...
-- -----------------------------------------------------------------------------

create policy "avatars: user manages own folder"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- campaign-logos: só admin escreve
-- -----------------------------------------------------------------------------

create policy "campaign-logos: admin writes"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'campaign-logos' and is_admin())
  with check (bucket_id = 'campaign-logos' and is_admin());

-- -----------------------------------------------------------------------------
-- lesson-thumbnails: só admin escreve
-- -----------------------------------------------------------------------------

create policy "lesson-thumbnails: admin writes"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'lesson-thumbnails' and is_admin())
  with check (bucket_id = 'lesson-thumbnails' and is_admin());

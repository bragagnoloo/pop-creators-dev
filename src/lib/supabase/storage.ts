import { createClient } from './client';

/**
 * Faz upload de um File para um bucket público e retorna a URL pública.
 * Se `oldUrl` pertencer ao mesmo bucket, tenta remover o arquivo antigo antes.
 */
export async function uploadImage(
  bucket: 'avatars' | 'campaign-logos' | 'lesson-thumbnails',
  path: string,
  file: File,
  oldUrl?: string | null
): Promise<string | null> {
  const supabase = createClient();

  // Remove antigo (best-effort)
  if (oldUrl) {
    const oldPath = extractPathFromPublicUrl(oldUrl, bucket);
    if (oldPath && oldPath !== path) {
      await supabase.storage.from(bucket).remove([oldPath]);
    }
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('[storage] upload error', error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeImage(bucket: string, url: string | null): Promise<void> {
  if (!url) return;
  const path = extractPathFromPublicUrl(url, bucket);
  if (!path) return;
  const supabase = createClient();
  await supabase.storage.from(bucket).remove([path]);
}

function extractPathFromPublicUrl(url: string, bucket: string): string | null {
  // Formato: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * Gera path único para o bucket avatars, sob a pasta do próprio usuário (exigência do RLS).
 */
export function avatarPath(userId: string, file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  return `${userId}/avatar-${Date.now()}.${ext}`;
}

export function campaignLogoPath(file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  return `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export function lessonThumbnailPath(file: File): string {
  const ext = file.name.split('.').pop() || 'jpg';
  return `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

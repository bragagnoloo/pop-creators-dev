import { createClient } from './client';

/**
 * Faz upload de um File para um bucket público e retorna a URL pública.
 * Se `oldUrl` pertencer ao mesmo bucket, tenta remover o arquivo antigo antes.
 */
export async function uploadImage(
  bucket: 'avatars' | 'campaign-logos' | 'lesson-thumbnails' | 'criarsemtigrinho-logos',
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

export function extractPathFromPublicUrl(url: string, bucket: string): string | null {
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

export function opportunityLogoPath(file: File): string {
  const ext = file.name.split('.').pop() || 'png';
  return `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export function videoPath(file: File): string {
  const ext = file.name.split('.').pop() || 'mp4';
  return `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/**
 * Faz upload de um vídeo para o bucket "videos" com callback de progresso.
 * Usa createSignedUploadUrl + XHR para expor onprogress (o SDK não expõe isso).
 */
export async function uploadVideo(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
  oldUrl?: string | null
): Promise<string | null> {
  const supabase = createClient();

  if (oldUrl) {
    const oldPath = extractPathFromPublicUrl(oldUrl, 'videos');
    if (oldPath && oldPath !== path) {
      await supabase.storage.from('videos').remove([oldPath]);
    }
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('videos')
    .createSignedUploadUrl(path, { upsert: true });

  if (signErr || !signed) {
    console.error('[storage] createSignedUploadUrl error', signErr);
    return null;
  }

  const contentType = file.type || (
    file.name.endsWith('.mov') ? 'video/quicktime' :
    file.name.endsWith('.webm') ? 'video/webm' : 'video/mp4'
  );

  const ok = await new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signed.signedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });

  if (!ok) {
    console.error('[storage] XHR video upload failed');
    return null;
  }

  const { data } = supabase.storage.from('videos').getPublicUrl(path);
  return data.publicUrl;
}

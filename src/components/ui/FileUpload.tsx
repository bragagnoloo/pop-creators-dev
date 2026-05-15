'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface FileUploadProps {
  bucket: string;
  /** Prefixo do caminho (ex: id da campanha). Resulta em `{pathPrefix}/{slug}-{file.name}`. */
  pathPrefix: string;
  /** MIME types aceitos. Default: qualquer. */
  accept?: string;
  /** Tamanho máximo em bytes. Default: 25MB. */
  maxSize?: number;
  /** Caminho atual (se já houver arquivo). Mostra nome + ação remover. */
  currentPath?: string | null;
  /** Disparado após upload bem-sucedido com o path final no bucket. */
  onUploaded: (path: string) => void;
  /** Disparado se houver botão remover e o usuário clicar (opcional). */
  onRemove?: () => Promise<void> | void;
  /** Label do botão padrão. */
  label?: string;
  disabled?: boolean;
}

const DEFAULT_MAX = 25 * 1024 * 1024;

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 80);
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUpload({
  bucket,
  pathPrefix,
  accept,
  maxSize = DEFAULT_MAX,
  currentPath,
  onUploaded,
  onRemove,
  label = 'Selecionar arquivo',
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressName, setProgressName] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (maxSize && file.size > maxSize) {
      setError(`Arquivo excede ${humanSize(maxSize)}.`);
      return;
    }
    if (accept) {
      const types = accept.split(',').map(t => t.trim());
      const ok = types.some(t => {
        if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -1));
        return file.type === t || file.name.toLowerCase().endsWith(t.replace(/^\./, ''));
      });
      if (!ok) {
        setError('Tipo de arquivo não suportado.');
        return;
      }
    }

    setIsUploading(true);
    setProgressName(file.name);
    try {
      const supabase = createClient();
      const fileName = `${Date.now()}-${slugify(file.name)}`;
      const path = `${pathPrefix}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) {
        setError(upErr.message || 'Falha ao enviar arquivo.');
        return;
      }
      onUploaded(path);
    } finally {
      setIsUploading(false);
      setProgressName(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsUploading(true);
    try {
      await onRemove();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || isUploading}
        className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {currentPath ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden className="text-xl">📎</span>
            <span className="text-sm text-text-primary truncate">{currentPath.split('/').pop()}</span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || isUploading}
              className="text-xs text-text-secondary hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors min-h-9"
            >
              Trocar
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors min-h-9"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors min-h-32 ${
            isDragging
              ? 'border-popline-pink bg-popline-pink/5'
              : 'border-border bg-surface hover:border-popline-pink/50'
          } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span aria-hidden className="text-3xl">⬆</span>
          <span className="text-sm text-text-primary font-medium">
            {isUploading ? `Enviando ${progressName}…` : label}
          </span>
          <span className="text-xs text-text-secondary">
            Arraste e solte ou clique para selecionar. Máx {humanSize(maxSize)}.
          </span>
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

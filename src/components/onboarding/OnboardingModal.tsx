'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import * as userService from '@/services/users';
import { uploadImage, avatarPath } from '@/lib/supabase/storage';

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      setError('A imagem deve ter no máximo 800KB.');
      return;
    }
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  };

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Digite seu nome completo.');
      return;
    }
    if (whatsapp.replace(/\D/g, '').length < 10) {
      setError('Digite um WhatsApp valido.');
      return;
    }

    setUploading(true);
    let finalPhoto = photoUrl;
    if (photoFile) {
      const uploaded = await uploadImage('avatars', avatarPath(userId, photoFile), photoFile);
      if (!uploaded) {
        setError('Falha ao enviar foto. Tente novamente.');
        setUploading(false);
        return;
      }
      finalPhoto = uploaded;
    }

    await userService.updateProfile(userId, {
      fullName: fullName.trim(),
      whatsapp,
      photoUrl: finalPhoto,
      onboardingComplete: true,
    });

    fetch('/api/email/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'welcome', data: { userId } }),
    }).catch(() => {});

    setUploading(false);
    onComplete();
  };

  return (
    <Modal isOpen title="Complete seu Perfil" closable={false}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-text-secondary">
          Precisamos de algumas informacoes para completar seu cadastro.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Photo upload */}
        <div className="flex flex-col items-center gap-3">
          <Avatar src={preview || photoUrl} name={fullName} size="xl" />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            {preview || photoUrl ? 'Trocar Foto' : 'Carregar Foto'}
          </Button>
        </div>

        <Input
          label="Nome Completo"
          placeholder="Seu nome completo"
          autoComplete="name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />

        <Input
          label="WhatsApp"
          placeholder="(11) 99999-9999"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={whatsapp}
          onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
          required
        />

        <Button type="submit" className="w-full" disabled={uploading}>
          {uploading ? 'Enviando...' : 'Salvar e Continuar'}
        </Button>
      </form>
    </Modal>
  );
}

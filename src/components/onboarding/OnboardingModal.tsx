'use client';

import { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import * as userService from '@/services/users';

interface OnboardingModalProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingModal({ userId, onComplete }: OnboardingModalProps) {
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError('A imagem deve ter no maximo 500KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const formatWhatsapp = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    userService.updateProfile(userId, {
      fullName: fullName.trim(),
      whatsapp,
      photoUrl,
      onboardingComplete: true,
    });

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
          <Avatar src={photoUrl} name={fullName} size="xl" />
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
            {photoUrl ? 'Trocar Foto' : 'Carregar Foto'}
          </Button>
        </div>

        <Input
          label="Nome Completo"
          placeholder="Seu nome completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />

        <Input
          label="WhatsApp"
          placeholder="(11) 99999-9999"
          value={whatsapp}
          onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
          required
        />

        <Button type="submit" className="w-full">
          Salvar e Continuar
        </Button>
      </form>
    </Modal>
  );
}

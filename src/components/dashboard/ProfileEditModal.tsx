'use client';

import { useState, useRef } from 'react';
import { UserProfile } from '@/types';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { InstagramIcon, TikTokIcon } from '@/components/ui/SocialIcons';
import { useCepLookup, formatCep } from '@/hooks/useCepLookup';

interface ProfileEditModalProps {
  profile: UserProfile;
  onSave: (data: Partial<UserProfile>) => void;
  onClose: () => void;
}

export default function ProfileEditModal({ profile, onSave, onClose }: ProfileEditModalProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp);
  const [bio, setBio] = useState(profile.bio);
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);
  const [instagram, setInstagram] = useState(profile.instagram);
  const [instagramFollowers, setInstagramFollowers] = useState(profile.instagramFollowers);
  const [tiktok, setTiktok] = useState(profile.tiktok);
  const [tiktokFollowers, setTiktokFollowers] = useState(profile.tiktokFollowers);
  const [cep, setCep] = useState(profile.cep || '');
  const [state, setState] = useState(profile.state);
  const [city, setCity] = useState(profile.city);
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood || '');
  const [address, setAddress] = useState(profile.address);
  const fileRef = useRef<HTMLInputElement>(null);

  const { lookup, loading: cepLoading, error: cepError } = useCepLookup();

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) return;
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

  const stripAt = (value: string) => value.replace(/^@/, '');

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    setCep(formatted);

    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      const result = await lookup(digits);
      if (result) {
        setState(result.state);
        setCity(result.city);
        setNeighborhood(result.neighborhood);
        if (result.street) {
          setAddress(result.street);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fullName, whatsapp, bio, photoUrl,
      instagram, instagramFollowers, tiktok, tiktokFollowers,
      cep, state, city, neighborhood, address,
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Editar Perfil">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Avatar src={photoUrl} name={fullName} size="lg" />
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
            Trocar Foto
          </Button>
        </div>

        <Input
          label="Nome Completo"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />

        <Input
          label="WhatsApp"
          value={whatsapp}
          onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
        />

        <Textarea
          label="Bio"
          placeholder="Conte um pouco sobre voce..."
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={3}
        />

        {/* Location via CEP */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-text-secondary font-medium">Localizacao</span>
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="CEP"
                placeholder="00000-000"
                value={cep}
                onChange={e => handleCepChange(e.target.value)}
                error={cepError}
              />
            </div>
            {cepLoading && (
              <div className="pb-3">
                <div className="w-5 h-5 border-2 border-popline-pink border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Estado"
              value={state}
              readOnly
              className="bg-surface-hover cursor-not-allowed"
              placeholder="Preenchido pelo CEP"
            />
            <Input
              label="Cidade"
              value={city}
              readOnly
              className="bg-surface-hover cursor-not-allowed"
              placeholder="Preenchido pelo CEP"
            />
          </div>

          <Input
            label="Bairro"
            value={neighborhood}
            readOnly
            className="bg-surface-hover cursor-not-allowed"
            placeholder="Preenchido pelo CEP"
          />

          <Input
            label="Endereco (rua, numero, complemento)"
            placeholder="Rua Example, 123, Apto 4"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        {/* Instagram */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <InstagramIcon className="w-4 h-4" />
            <span className="text-sm text-text-secondary font-medium">Instagram</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="seu_usuario"
              value={instagram}
              onChange={e => setInstagram(stripAt(e.target.value))}
            />
            <Input
              placeholder="Seguidores (ex: 15000)"
              value={instagramFollowers}
              onChange={e => setInstagramFollowers(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {/* TikTok */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TikTokIcon className="w-4 h-4" />
            <span className="text-sm text-text-secondary font-medium">TikTok</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="seu_usuario"
              value={tiktok}
              onChange={e => setTiktok(stripAt(e.target.value))}
            />
            <Input
              placeholder="Seguidores (ex: 50000)"
              value={tiktokFollowers}
              onChange={e => setTiktokFollowers(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

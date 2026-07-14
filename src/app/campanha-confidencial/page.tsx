'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SoundWaves from '@/components/landing/SoundWaves';
import { formatCpf, isValidCpf } from '@/lib/cpf';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function stripAt(v: string) {
  return v.replace(/^@+/, '');
}

const INITIAL = {
  nomeCompleto: '',
  dataNascimento: '',
  instagram: '',
  tiktok: '',
  nacionalidade: 'Brasileira',
  cpf: '',
  rg: '',
  pix: '',
  endereco: '',
  cidadeEstado: '',
  email: '',
};

type FormState = typeof INITIAL;

export default function CampanhaConfidencialPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const cpfValid = isValidCpf(form.cpf);

  const isValid =
    form.nomeCompleto.trim().length >= 3 &&
    form.dataNascimento.trim().length > 0 &&
    form.instagram.trim().length > 0 &&
    form.tiktok.trim().length > 0 &&
    form.nacionalidade.trim().length > 0 &&
    cpfValid &&
    form.rg.trim().length > 0 &&
    form.pix.trim().length > 0 &&
    form.endereco.trim().length > 0 &&
    form.cidadeEstado.trim().length > 0 &&
    isValidEmail(form.email);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      let value = raw;
      if (field === 'cpf') value = formatCpf(raw);
      if (field === 'instagram' || field === 'tiktok') value = stripAt(raw);
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/campanha-confidencial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
    } catch {
      setError('Algo deu errado ao enviar. Confira os dados e tente novamente.');
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-x-hidden noise-overlay grid-bg">
      {/* Top bar com glass */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-16 px-6 backdrop-blur-md bg-background/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold gradient-text tracking-tight">POPline</span>
          <span className="text-sm font-medium text-text-secondary tracking-widest uppercase">Creators</span>
        </div>
      </header>

      <SoundWaves />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-popline-magenta/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 -right-40 w-[500px] h-[500px] bg-popline-pink/15 rounded-full blur-[120px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-popline-light/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-24">
        {/* Badge */}
        <div className="flex justify-center animate-slide-up">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-card border border-popline-pink/20">
            <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
            <span className="text-popline-light text-xs font-bold tracking-widest">
              CONVITE CONFIDENCIAL
            </span>
            <span className="w-2 h-2 rounded-full bg-popline-pink animate-pulse" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="animate-slide-up-delay-1 mt-6 text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-center">
          Você foi <span className="gradient-text">pré-selecionado(a)</span>
        </h1>
        <p className="animate-slide-up-delay-2 mt-4 text-base sm:text-lg text-text-secondary text-center leading-relaxed max-w-xl mx-auto">
          Preencha seus dados abaixo para participar da seleção desta oportunidade exclusiva do
          POPline Creators. Após o envio, encaminharemos o Termo de Confidencialidade (NDA) para
          assinatura.
        </p>

        {/* Card do formulário */}
        <div className="animate-slide-up-delay-3 mt-10 glass-card rounded-2xl border border-border/60 p-6 sm:p-8">
          {success ? (
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-popline-pink/15 border border-popline-pink/30 flex items-center justify-center text-2xl">
                ✓
              </div>
              <h2 className="text-2xl font-bold">Inscrição recebida!</h2>
              <p className="text-text-secondary max-w-md leading-relaxed">
                Recebemos seus dados com sucesso. Em breve encaminharemos o Termo de
                Confidencialidade para assinatura e, na sequência, os detalhes da campanha.
              </p>
              <p className="text-xs text-text-secondary/70">
                Você já pode fechar esta página.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Input
                label="Nome completo"
                type="text"
                placeholder="Seu nome completo"
                value={form.nomeCompleto}
                onChange={update('nomeCompleto')}
                required
                autoFocus
              />

              <Input
                label="Data de nascimento"
                type="date"
                value={form.dataNascimento}
                onChange={update('dataNascimento')}
                max={new Date().toISOString().slice(0, 10)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Perfil no Instagram"
                  type="text"
                  placeholder="@seuperfil"
                  value={form.instagram}
                  onChange={update('instagram')}
                  required
                />
                <Input
                  label="Perfil no TikTok"
                  type="text"
                  placeholder="@seuperfil"
                  value={form.tiktok}
                  onChange={update('tiktok')}
                  required
                />
              </div>

              <Input
                label="Nacionalidade"
                type="text"
                placeholder="Ex.: Brasileira"
                value={form.nacionalidade}
                onChange={update('nacionalidade')}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="CPF"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={update('cpf')}
                  error={form.cpf.length > 0 && !cpfValid ? 'CPF inválido' : undefined}
                  required
                />
                <Input
                  label="RG"
                  type="text"
                  placeholder="Número do RG"
                  value={form.rg}
                  onChange={update('rg')}
                  required
                />
              </div>

              <Input
                label="Chave Pix"
                type="text"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={form.pix}
                onChange={update('pix')}
                required
              />

              <Input
                label="Endereço completo"
                type="text"
                placeholder="Rua, número, complemento, bairro, CEP"
                value={form.endereco}
                onChange={update('endereco')}
                required
              />

              <Input
                label="Cidade/Estado"
                type="text"
                placeholder="Ex.: São Paulo/SP"
                value={form.cidadeEstado}
                onChange={update('cidadeEstado')}
                required
              />

              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={update('email')}
                required
              />

              {error && <p className="text-sm text-red-400 text-center">{error}</p>}

              <Button
                type="submit"
                size="lg"
                disabled={!isValid || loading}
                className="w-full mt-1 font-bold"
              >
                {loading ? 'Enviando...' : 'Enviar Formulário'}
              </Button>

              <p className="text-xs text-text-secondary text-center leading-relaxed">
                Seus dados são tratados de forma confidencial e usados exclusivamente para fins
                desta campanha, conforme a LGPD.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

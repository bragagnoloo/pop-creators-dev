import { createAdminClient } from '@/lib/supabase/server';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import ExperiencesSection from '@/components/landing/ExperiencesSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ExpertsSection from '@/components/landing/ExpertsSection';
import PlansSection from '@/components/landing/PlansSection';
import CampaignsMarquee from '@/components/landing/CampaignsMarquee';
import FaqSection from '@/components/landing/FaqSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { isPromoActive } from '@/services/subscriptions';

// A home é pré-renderizada. Sem isto, as campanhas abertas e as oficinas
// publicadas só mudariam na LP quando saísse um deploy novo. Com a
// revalidação, uma alteração no admin aparece em no máximo 5 minutos.
export const revalidate = 300;

export default async function Home() {
  const supabase = createAdminClient();

  // O filtro de arquivadas é explícito porque createAdminClient usa a service
  // role, que ignora RLS — a policy "campaigns: hide archived" (0040) não vale aqui.
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, title')
    .eq('status', 'open')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Oficinas publicadas viram os cards de experts da LP. Fica dinâmico para a
  // dobra não envelhecer toda vez que uma oficina nova entra no ar.
  const { data: workshops } = await supabase
    .from('workshops')
    .select('title, expert, thumbnail_url')
    .eq('status', 'available')
    .not('expert', 'is', null)
    .order('position');

  const experts = (workshops ?? [])
    .filter((w) => (w.expert as string | null)?.trim())
    .map((w) => ({
      name: (w.expert as string).trim(),
      title: (w.title as string).trim(),
      thumbnail_url: (w.thumbnail_url as string | null) ?? null,
    }));

  // Decidido no servidor para navbar (faixa) e hero (recuo) baterem desde o
  // primeiro paint. Com a revalidação de 5 min, a faixa pode entrar/sair até
  // 5 min depois do horário; o contador da faixa se esconde sozinho no fim.
  const promo = isPromoActive();

  return (
    <>
      <Navbar promo={promo} />
      <main className="flex-1">
        <HeroSection promo={promo} />
        <CampaignsMarquee campaigns={(campaigns ?? []).map(c => ({ id: c.id as string, title: c.title as string }))} />
        <ExperiencesSection />
        <FeaturesSection />
        <ExpertsSection experts={experts} />
        <HowItWorksSection />
        <PlansSection promo={promo} />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

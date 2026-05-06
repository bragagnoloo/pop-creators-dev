import { createAdminClient } from '@/lib/supabase/server';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ExpertsSection from '@/components/landing/ExpertsSection';
import PlansSection from '@/components/landing/PlansSection';
import CampaignsMarquee from '@/components/landing/CampaignsMarquee';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default async function Home() {
  const supabase = createAdminClient();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, title')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  // Busca oficinas (workshops) com expert para a seção de experts na LP
  const { data: workshops } = await supabase
    .from('workshops')
    .select('id, title, expert, thumbnail_url, description')
    .not('expert', 'is', null)
    .order('position');

  const expertWorkshops = (workshops ?? []).map((w) => ({
    id: w.id as string,
    title: w.title as string,
    expert: w.expert as string,
    thumbnail_url: (w.thumbnail_url as string | null) ?? null,
    description: w.description as string,
  }));

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <CampaignsMarquee campaigns={(campaigns ?? []).map(c => ({ id: c.id as string, title: c.title as string }))} />
        <FeaturesSection />
        <ExpertsSection lessons={expertWorkshops} />
        <HowItWorksSection />
        <PlansSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

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


  return (
    <>
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <CampaignsMarquee campaigns={(campaigns ?? []).map(c => ({ id: c.id as string, title: c.title as string }))} />
        <FeaturesSection />
        <ExpertsSection />
        <HowItWorksSection />
        <PlansSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

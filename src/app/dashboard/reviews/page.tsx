import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

/**
 * Rota antiga da aba Reviews, que virou sub-aba de Campanhas (migration 0035).
 *
 * Redirect temporário (307) de propósito, não permanente (308): o 308 é cacheado
 * pelo browser e travaria a URL se um dia precisarmos voltar atrás. Nada externo
 * aponta para cá — os templates de e-mail e os scripts de disparo usam
 * /dashboard/campanhas —, então não há SEO a preservar que justifique o risco.
 */
export default function ReviewsRedirect() {
  redirect(ROUTES.CAMPANHAS_REVIEWS);
}

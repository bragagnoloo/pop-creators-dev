import UgcLogo from '@/components/ui/UgcLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-8">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold gradient-text">POPline</span>
              <span className="text-sm text-text-secondary">Creators</span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://portalpopline.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Portal POPline
              </a>
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Termos
              </a>
              <a href="#" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Privacidade
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-secondary">
              &copy; {new Date().getFullYear()} POPline. Todos os direitos reservados.
            </p>

            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Tecnologia</span>
              <UgcLogo size={18} />
              <span className="font-medium text-text-primary">UGC+</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

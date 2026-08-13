'use client';

/**
 * Toggle Disponíveis/Participando das sub-abas de campanha.
 *
 * Extraído do FilterButton que existia duplicado em campanhas/page.tsx e
 * reviews/page.tsx — as duas cópias eram byte-idênticas exceto pela cor do
 * estado ativo, que agora vem do tema da categoria. O markup é o mesmo de antes.
 */

interface FilterToggleOption<T extends string> {
  value: T;
  label: string;
  count: number;
}

interface FilterToggleProps<T extends string> {
  value: T;
  options: FilterToggleOption<T>[];
  onChange: (value: T) => void;
  /** Classe do botão ativo, vinda de theme.filterActive. */
  activeClass: string;
}

export default function FilterToggle<T extends string>({
  value,
  options,
  onChange,
  activeClass,
}: FilterToggleProps<T>) {
  return (
    <div className="inline-flex p-1 bg-white/5 border border-border rounded-xl mb-6">
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              active ? activeClass : 'text-text-secondary hover:text-white'
            }`}
          >
            {option.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20' : 'bg-white/5'
              }`}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const sizePx: Record<NonNullable<AvatarProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export default function Avatar({ src, name = '', size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    const px = sizePx[size];
    return (
      <Image
        src={src}
        alt={name || 'Avatar'}
        width={px}
        height={px}
        className={`${sizes[size]} rounded-full object-cover border-2 border-border`}
        sizes={`${px}px`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full gradient-bg flex items-center justify-center font-bold text-white`}>
      {initials || '?'}
    </div>
  );
}

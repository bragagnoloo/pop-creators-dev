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

export default function Avatar({ src, name = '', size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover border-2 border-border`}
      />
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full gradient-bg flex items-center justify-center font-bold text-white`}>
      {initials || '?'}
    </div>
  );
}

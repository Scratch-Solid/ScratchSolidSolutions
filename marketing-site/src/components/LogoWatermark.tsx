interface LogoWatermarkProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48 sm:w-64 sm:h-64',
  lg: 'w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96',
};

export default function LogoWatermark({ size = 'md' }: LogoWatermarkProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
      <img
        src="/scratchsolid-logo.jpg"
        alt=""
        aria-hidden="true"
        className={`opacity-[0.07] object-contain animate-spin-slow ${sizeMap[size]}`}
      />
    </div>
  );
}

'use client';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BrandLogo({ className = '', size = 'md' }: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: {
      ugc: 'text-sm font-bold',
      slash: 'text-base font-extrabold mx-1',
      studio: 'text-xs font-normal tracking-[0.2em]',
    },
    md: {
      ugc: 'text-lg sm:text-xl font-bold tracking-tight',
      slash: 'text-xl sm:text-2xl font-black mx-2',
      studio: 'text-sm sm:text-base font-medium tracking-[0.25em]',
    },
    lg: {
      ugc: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
      slash: 'text-2xl sm:text-3xl font-black mx-2.5',
      studio: 'text-lg sm:text-xl font-medium tracking-[0.3em]',
    },
  };

  const t = textSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Exact Logo Icon */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0`}>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(168,85,247,0.35)]"
        >
          <defs>
            {/* Outer border gradient: Cyan -> Purple -> Pink */}
            <linearGradient id="ugcBorderGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Center play triangle gradient: Blue -> Light Purple */}
            <linearGradient id="ugcPlayGrad" x1="20%" y1="20%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Sparkle gradient */}
            <linearGradient id="ugcSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf4ff" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          {/* Rounded Squircle Background with Gradient Border */}
          <rect
            x="1.5"
            y="1.5"
            width="33"
            height="33"
            rx="9"
            fill="#09090d"
            stroke="url(#ugcBorderGrad)"
            strokeWidth="2.5"
          />

          {/* Film Sprocket Marks (Left Side) */}
          <rect x="5.5" y="8" width="2.5" height="4" rx="1" fill="#38bdf8" opacity="0.95" />
          <rect x="5.5" y="16" width="2.5" height="4" rx="1" fill="#60a5fa" opacity="0.95" />
          <rect x="5.5" y="24" width="2.5" height="4" rx="1" fill="#818cf8" opacity="0.95" />

          {/* Center Play Symbol */}
          <path
            d="M13.5 11.2C13.5 10.3 14.5 9.7 15.3 10.2L23.8 16.5C24.5 17.0 24.5 18.0 23.8 18.5L15.3 24.8C14.5 25.3 13.5 24.7 13.5 23.8V11.2Z"
            fill="url(#ugcPlayGrad)"
          />

          {/* Sparkle Star (Top Right Corner) */}
          <path
            d="M26 6C26 7.5 27 8.5 28.5 8.5C27 8.5 26 9.5 26 11C26 9.5 25 8.5 23.5 8.5C25 8.5 26 7.5 26 6Z"
            fill="url(#ugcSparkleGrad)"
          />
        </svg>
      </div>

      {/* UGC / STUDIO Typography */}
      <div className="flex items-center leading-none">
        <span className={`text-white font-sans ${t.ugc}`}>
          UGC
        </span>
        <span
          className={`font-sans bg-clip-text text-transparent bg-gradient-to-tr from-[#38bdf8] via-[#818cf8] to-[#c084fc] ${t.slash}`}
          style={{ transform: 'skewX(-10deg)' }}
        >
          /
        </span>
        <span className={`text-[#e4e4e7] font-sans ${t.studio}`}>
          STUDIO
        </span>
      </div>
    </div>
  );
}

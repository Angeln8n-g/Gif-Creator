import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="GifCreatorPro Logo"
    >
      <defs>
        {/* Main Rose to Purple gradient matching the brand colors */}
        <linearGradient id="rose-purple" x1="12" y1="8" x2="84" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E11D48" />
          <stop offset="60%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Back frames gradient for depth */}
        <linearGradient id="purple-blue" x1="12" y1="8" x2="84" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* Glowing backdrop shadow */}
        <filter id="logo-glow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feColorMatrix
            type="matrix"
            values="
              1 0 0 0 0.88
              0 1 0 0 0.11
              0 0 1 0 0.28
              0 0 0 0.25 0
            "
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Back Frame (Frame 1 - Timeline) */}
      <rect
        x="12"
        y="8"
        width="56"
        height="56"
        rx="14"
        stroke="url(#purple-blue)"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        opacity="0.3"
      />

      {/* Middle Frame (Frame 2 - Motion Blur) */}
      <rect
        x="20"
        y="16"
        width="56"
        height="56"
        rx="14"
        stroke="url(#purple-blue)"
        strokeWidth="2.5"
        opacity="0.6"
      />

      {/* Front Frame (Frame 3 - Current/Active) */}
      <g filter="url(#logo-glow)">
        <rect
          x="28"
          y="24"
          width="56"
          height="56"
          rx="14"
          fill="#0F0F23"
          stroke="url(#rose-purple)"
          strokeWidth="3.5"
        />

        {/* Play Icon in the Center of Front Frame */}
        {/* Center of front frame is at (56, 52) */}
        <path
          d="M51 41.5C51 40.7 51.9 40.2 52.6 40.6L65.6 48.1C66.3 48.5 66.3 49.5 65.6 49.9L52.6 57.4C51.9 57.8 51 57.3 51 56.5V41.5Z"
          fill="#F8FAFC"
        />

        {/* Infinity Loop (Endless GIF repetition) at the bottom of Front Frame */}
        {/* Center of loop is at (56, 69) */}
        <path
          d="M 56 69 C 52.5 64.5, 42.5 64.5, 42.5 69 C 42.5 73.5, 52.5 73.5, 56 69 C 59.5 64.5, 69.5 64.5, 69.5 69 C 69.5 73.5, 59.5 73.5, 56 69 Z"
          fill="none"
          stroke="#F8FAFC"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
      </g>
    </svg>
  );
};

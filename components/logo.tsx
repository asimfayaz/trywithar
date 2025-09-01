"use client"

export const Logo = () => (
  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 64 64" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M16 8h-4a8 8 0 0 0-8 8v4" />
      <path d="M48 8h4a8 8 0 0 1 8 8v4" />
      <path d="M16 56h-4a8 8 0 0 1-8-8v-4" />
      <path d="M48 56h4a8 8 0 0 0 8-8v-4" />
      <polygon points="32,16 48,25 48,41 32,50 16,41 16,25" />
      <polyline points="32,50 32,34 48,25" />
      <polyline points="32,34 16,25" />
    </svg>
  </div>
);

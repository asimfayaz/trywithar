import Link from "next/link";
import React from "react";

interface BackButtonProps {
  target?: string;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  target = "/", 
  className = "text-blue-600 hover:text-blue-800" 
}) => {
  return (
    <Link href={target} className={className} aria-label="Go back">
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M15 19l-7-7 7-7" 
        />
      </svg>
    </Link>
  );
};

export default BackButton;

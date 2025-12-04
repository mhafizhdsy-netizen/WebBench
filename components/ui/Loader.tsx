import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
  className?: string;
  text?: string;
}

export const WebBenchLoader: React.FC<LoaderProps> = ({ 
  size = 'md', 
  fullScreen = false, 
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-24 h-24",
    xl: "w-32 h-32"
  };

  const LoaderIcon = () => (
    <svg 
      className={`${sizeClasses[size]} ${className}`} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Outer Hexagon */}
      <path 
        d="M12 2l9 4.9V17L12 22l-9-4.9V7z" 
        className="text-accent animate-draw-stroke" 
        style={{ strokeDasharray: 62, strokeDashoffset: 62 }}
      />
      
      {/* Inner Brackets */}
      <path 
        d="M9.5 10l-2.5 2.5 2.5 2.5" 
        className="text-white animate-draw-stroke" 
        style={{ strokeDasharray: 8, strokeDashoffset: 8, animationDelay: '0.2s' }}
      />
      <path 
        d="M14.5 10l2.5 2.5-2.5 2.5" 
        className="text-white animate-draw-stroke" 
        style={{ strokeDasharray: 8, strokeDashoffset: 8, animationDelay: '0.2s' }}
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
        <div className="relative">
          <LoaderIcon />
          <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full -z-10 animate-pulse"></div>
        </div>
        {text && (
          <div className="mt-6 text-gray-400 font-medium tracking-wider text-sm animate-pulse">
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <LoaderIcon />
      {text && <span className="mt-2 text-xs text-gray-500">{text}</span>}
    </div>
  );
};
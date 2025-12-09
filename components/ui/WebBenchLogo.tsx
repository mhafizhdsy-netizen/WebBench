import React from 'react';

// New Logo Component
export const WebBenchLogo = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" className="text-accent fill-accent/20" />
    <path d="M9.5 10l-2.5 2.5 2.5 2.5" className="text-white" />
    <path d="M14.5 10l2.5 2.5-2.5 2.5" className="text-white" />
  </svg>
);
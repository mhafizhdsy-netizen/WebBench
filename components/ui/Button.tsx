import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  className = '', 
  variant = 'primary', 
  size = 'xs', // Default size for mobile-first
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-accent text-white hover:bg-blue-600 shadow-sm",
    secondary: "bg-active text-white hover:bg-[#3a3d41] border border-border",
    danger: "bg-error text-white hover:bg-red-600",
    ghost: "hover:bg-active text-gray-300 hover:text-white",
    icon: "hover:bg-active text-gray-400 hover:text-white rounded"
  };

  // Mobile-first sizing: default (no prefix) is smallest, then scale up with md: / lg:
  const sizes = {
    xs: "h-7 px-2.5 text-xs", // Smallest size, new default
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-base",
    lg: "h-11 px-6 text-lg"
  };
  
  // Custom padding for icon variant
  const iconPadding = "p-1.5 md:p-2"; 

  const combinedClassName = `${baseStyles} ${variants[variant]} ${variant !== 'icon' ? sizes[size] : iconPadding} ${className}`;

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-accent text-white hover:bg-blue-600 shadow-sm",
    secondary: "bg-active text-white hover:bg-[#3a3d41] border border-border",
    danger: "bg-error text-white hover:bg-red-600",
    ghost: "hover:bg-active text-gray-300 hover:text-white",
    icon: "hover:bg-active text-gray-400 hover:text-white p-1 rounded"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2",
    lg: "h-12 px-8 text-lg"
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${variant !== 'icon' ? sizes[size] : ''} ${className}`;

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};
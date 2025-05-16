import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
type ButtonSize = 'sm' | 'md' | 'lg';

// Base button props shared by all button types
type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: (e?: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
  className?: string;
};

// Props for standard button element
type ButtonAsButtonProps = ButtonBaseProps & {
  as?: 'button';
  type?: 'button' | 'submit' | 'reset';
};

// Props for anchor element
type ButtonAsAnchorProps = ButtonBaseProps & {
  as: 'a';
  href: string;
};

// Props for Link component from react-router
type ButtonAsLinkProps = ButtonBaseProps & {
  as: typeof Link;
  to: string;
};

// Combined props type
type ButtonProps = 
  | ButtonAsButtonProps 
  | ButtonAsAnchorProps 
  | ButtonAsLinkProps;

// Function to generate the class names based on props
function getButtonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  fullWidth = false,
  disabled = false,
  className = ''
): string {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500',
    info: 'bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-500',
    light: 'bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-300',
    dark: 'bg-gray-800 hover:bg-gray-900 text-white focus:ring-gray-700',
  };
  
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`.trim();
}

// The Button component
const Button = (props: ButtonProps): React.ReactElement => {
  const { 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    disabled = false, 
    onClick, 
    children, 
    className = '' 
  } = props;

  const classes = getButtonClasses(variant, size, fullWidth, disabled, className);

  // If we're rendering as a Link component
  if (props.as === Link) {
    const { to, ...rest } = props as ButtonAsLinkProps;
    return (
      <Link
        className={classes}
        to={to}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        {...rest}
      >
        {children}
      </Link>
    );
  }

  // If we're rendering as an anchor element
  if (props.as === 'a') {
    const { href, ...rest } = props as ButtonAsAnchorProps;
    return (
      <a
        className={classes}
        href={href}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  // Otherwise render as a regular button
  const { type = 'button', ...rest } = props as ButtonAsButtonProps;
  return (
    <button
      className={classes}
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;

import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Button = React.forwardRef(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium active:scale-[0.99] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F5400]/30 dark:focus-visible:ring-white/30 hover:border-transparent";

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-11 px-5",
    };

    const variants = {
      primary: "bg-[#8F5400] text-white shadow-sm hover:opacity-90",
      secondary: "text-black bg-transparent",
      outline: "bg-transparent border border-black text-black hover:bg-gray-100 dark:border-white dark:text-white dark:hover:bg-gray-800",
      eliminar: "text-red-600 bg-transparent hover:bg-gray-100 hover:border-transparent",
      link: "bg-transparent text-[#8F5400] hover:underline dark:text-white",
    };

    const widthCls = fullWidth ? "w-full" : "";

    const classes = twMerge(base, sizes[size], variants[variant] || variants.primary, widthCls, className);

    const isDisabled = disabled || isLoading;

    return (
      <button ref={ref} {...props} className={classes} disabled={isDisabled}>
        {isLoading && (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent dark:border-t-transparent mr-1" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
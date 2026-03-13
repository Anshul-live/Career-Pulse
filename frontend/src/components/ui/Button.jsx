import React from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";

const variants = {
  default: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
  primary: "bg-blue-600 text-white hover:bg-blue-500",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  ghost: "bg-transparent hover:bg-zinc-800 text-zinc-300",
  outline: "border-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  warning: "bg-amber-500 text-white hover:bg-amber-400",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
  icon: "p-2",
};

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  onClick,
  disabled,
  ...props
}) {
  const btnRef = React.useRef(null);

  const handleMouseEnter = () => {
    gsap.to(btnRef.current, {
      scale: 1.02,
      duration: 0.2,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(btnRef.current, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out",
    });
  };

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

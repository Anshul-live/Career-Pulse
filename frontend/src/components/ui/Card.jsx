import React from "react";
import { gsap } from "gsap";
import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
  hover = false,
  onClick,
  ...props
}) {
  const cardRef = React.useRef(null);

  const handleMouseEnter = () => {
    if (hover && cardRef.current) {
      gsap.to(cardRef.current, {
        y: -4,
        boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.4)",
        duration: 0.3,
        ease: "power3.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (hover && cardRef.current) {
      gsap.to(cardRef.current, {
        y: 0,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
        duration: 0.3,
        ease: "power3.out",
      });
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "bg-zinc-900 rounded-2xl shadow-sm border border-zinc-800 p-6 transition-all duration-300",
        hover && "cursor-pointer hover:border-zinc-600",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn("text-xl font-semibold text-zinc-100", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }) {
  return (
    <p className={cn("text-sm text-zinc-500 mt-1", className)}>
      {children}
    </p>
  );
}

export function CardContent({ children, className }) {
  return <div className={cn(className)}>{children}</div>;
}

export function CardFooter({ children, className }) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-zinc-800", className)}>
      {children}
    </div>
  );
}

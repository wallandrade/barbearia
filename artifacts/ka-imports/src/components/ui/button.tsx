import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger" | "destructive";
  size?: "sm" | "md" | "lg" | "icon" | "default";
  isLoading?: boolean;
}

const buttonVariantClasses = {
  default: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 border border-primary/20",
  outline: "border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
  secondary: "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 hover:-translate-y-0.5",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
};

const buttonSizeClasses = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 font-medium",
  lg: "h-14 px-8 text-lg font-semibold",
  icon: "h-12 w-12 flex items-center justify-center p-0",
};

const buttonBaseClasses = "inline-flex items-center justify-center rounded-xl transition-all duration-300 ease-out active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none";

export function buttonVariants(options?: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}): string {
  const variant = options?.variant ?? "default";
  const size = !options?.size || options.size === "default" ? "md" : options.size;
  return cn(buttonBaseClasses, buttonVariantClasses[variant], buttonSizeClasses[size], options?.className);
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };

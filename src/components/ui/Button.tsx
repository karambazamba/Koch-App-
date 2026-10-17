import type { ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./styles";

type Props = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Volle Breite */
  block?: boolean;
};

/** Button im einheitlichen Stil; für Links `buttonClass()` verwenden. */
export function Button({ variant = "primary", size = "md", icon: Icon, block, className = "", children, type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${block ? "w-full" : ""} ${className}`} {...rest}>
      {Icon && <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
      {children}
    </button>
  );
}

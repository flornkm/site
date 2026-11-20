import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import React from "react";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const headingVariants = cva("fw-medium text-primary", {
  variants: {
    size: {
      h1: "text-sm",
      h2: "text-sm",
      h3: "text-sm",
      h4: "text-sm",
      h5: "text-xs",
      h6: "text-xs",
    },
  },
});

export const H1 = ({ children, className = "", ...props }: HeadingProps) => {
  return (
    <h1 className={cn(headingVariants({ size: "h1" }), className)} {...props}>
      {children}
    </h1>
  );
};

export const H2 = ({ children, className = "", ...props }: HeadingProps) => {
  return (
    <h2 className={cn(headingVariants({ size: "h2" }), className)} {...props}>
      {children}
    </h2>
  );
};

export const H3 = ({ children, className = "", ...props }: HeadingProps) => {
  return (
    <h3 className={cn(headingVariants({ size: "h3" }), className)} {...props}>
      {children}
    </h3>
  );
};

export const H4 = ({ children, className = "", ...props }: HeadingProps) => {
  return (
    <h4 className={cn(headingVariants({ size: "h4" }), className)} {...props}>
      {children}
    </h4>
  );
};

export const H5 = ({ children, className = "", ...props }: HeadingProps) => {
  return (
    <h5 className={cn(headingVariants({ size: "h5" }), className)} {...props}>
      {children}
    </h5>
  );
};

export const H6 = ({ children, className = "", ...props }: HeadingProps) => {
  return (
    <h6 className={cn(headingVariants({ size: "h6" }), className)} {...props}>
      {children}
    </h6>
  );
};

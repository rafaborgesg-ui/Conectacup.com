"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps, toast } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton
      duration={3000}
      swipeToDismissDirection="up"
      interactiveToasts={true}
      pauseWhenPageIsHidden
      expand={true}
      visibleToasts={9}
      offset={10}
      gap={12}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cursor-pointer group-[.toaster]:pointer-events-auto select-none hover:brightness-95 active:scale-[0.98] transition-all',
          closeButton: 'pointer-events-auto',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
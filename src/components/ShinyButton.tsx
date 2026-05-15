"use client";

import type React from "react";
import Link from "next/link";

type ShinyButtonBaseProps = {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm";
};

type ShinyButtonAsButton = ShinyButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ShinyButtonAsLink = ShinyButtonBaseProps & {
  href: string;
};

type ShinyButtonProps = ShinyButtonAsButton | ShinyButtonAsLink;

export function ShinyButton({
  children,
  className = "",
  size = "default",
  ...props
}: ShinyButtonProps) {
  const sizeClass = size === "sm" ? "shiny-cta-sm" : "";
  const combinedClass = `shiny-cta ${sizeClass} ${className}`.trim();

  const inner = <span>{children}</span>;

  return (
    <>
      <style jsx global>{`
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @property --gradient-angle-offset {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @property --gradient-percent {
          syntax: "<percentage>";
          initial-value: 5%;
          inherits: false;
        }

        @property --gradient-shine {
          syntax: "<color>";
          initial-value: white;
          inherits: false;
        }

        .shiny-cta {
          --shiny-cta-bg: #050505;
          --shiny-cta-bg-subtle: #1a1818;
          --shiny-cta-fg: #ffffff;
          --shiny-cta-highlight: #25f2b8;
          --shiny-cta-highlight-subtle: #f6c466;
          --animation: gradient-angle linear infinite;
          --duration: 3s;
          --shadow-size: 2px;
          --transition: 800ms cubic-bezier(0.25, 1, 0.5, 1);
          
          display: inline-flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          outline-offset: 4px;
          padding: 0.875rem 2rem;
          font-family: var(--font-inter), sans-serif;
          font-size: 1.125rem;
          line-height: 1.2;
          font-weight: 500;
          border: 1px solid transparent;
          border-radius: 360px;
          color: var(--shiny-cta-fg);
          background: linear-gradient(var(--shiny-cta-bg), var(--shiny-cta-bg)) padding-box,
            conic-gradient(
              from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
              transparent,
              var(--shiny-cta-highlight) var(--gradient-percent),
              var(--gradient-shine) calc(var(--gradient-percent) * 2),
              var(--shiny-cta-highlight) calc(var(--gradient-percent) * 3),
              transparent calc(var(--gradient-percent) * 4)
            ) border-box;
          box-shadow: inset 0 0 0 1px var(--shiny-cta-bg-subtle);
          transition: var(--transition);
          transition-property: --gradient-angle-offset, --gradient-percent, --gradient-shine;
        }

        .shiny-cta:disabled {
          cursor: not-allowed;
          opacity: 0.65;
          filter: saturate(0.8);
          transform: none;
        }

        .shiny-cta::before,
        .shiny-cta::after,
        .shiny-cta span::before {
          content: "";
          pointer-events: none;
          position: absolute;
          inset-inline-start: 50%;
          inset-block-start: 50%;
          translate: -50% -50%;
          z-index: -1;
        }

        .shiny-cta:active {
          translate: 0 1px;
        }

        /* Dots pattern */
        .shiny-cta::before {
          --size: calc(100% - var(--shadow-size) * 3);
          --position: 2px;
          --space: calc(var(--position) * 2);
          width: var(--size);
          height: var(--size);
          background: radial-gradient(
            circle at var(--position) var(--position),
            white calc(var(--position) / 4),
            transparent 0
          ) padding-box;
          background-size: var(--space) var(--space);
          background-repeat: space;
          mask-image: conic-gradient(
            from calc(var(--gradient-angle) + 45deg),
            black,
            transparent 10% 90%,
            black
          );
          border-radius: inherit;
          opacity: 0.4;
          z-index: -1;
        }

        /* Inner shimmer */
        .shiny-cta::after {
          --animation: shimmer linear infinite;
          width: 100%;
          aspect-ratio: 1;
          background: linear-gradient(
            -50deg,
            transparent,
            var(--shiny-cta-highlight),
            transparent
          );
          mask-image: radial-gradient(circle at bottom, transparent 40%, black);
          opacity: 0.6;
        }

        .shiny-cta span {
          z-index: 1;
        }

        .shiny-cta span::before {
          --size: calc(100% + 1rem);
          width: var(--size);
          height: var(--size);
          box-shadow: inset 0 -1ex 2rem 4px var(--shiny-cta-highlight);
          opacity: 0;
          transition: opacity var(--transition);
          animation: calc(var(--duration) * 1.5) breathe linear infinite;
        }

        /* Animate */
        .shiny-cta,
        .shiny-cta::before,
        .shiny-cta::after {
          animation: var(--animation) var(--duration),
            var(--animation) calc(var(--duration) / 0.4) reverse paused;
          animation-composition: add;
        }

        .shiny-cta:is(:hover, :focus-visible) {
          --gradient-percent: 20%;
          --gradient-angle-offset: 95deg;
          --gradient-shine: var(--shiny-cta-highlight-subtle);
        }

        .shiny-cta:is(:hover, :focus-visible),
        .shiny-cta:is(:hover, :focus-visible)::before,
        .shiny-cta:is(:hover, :focus-visible)::after {
          animation-play-state: running;
        }

        .shiny-cta:is(:hover, :focus-visible) span::before {
          opacity: 1;
        }

        .shiny-cta:disabled::before,
        .shiny-cta:disabled::after,
        .shiny-cta:disabled span::before {
          animation-play-state: paused;
        }

        @keyframes gradient-angle {
          to {
            --gradient-angle: 360deg;
          }
        }

        @keyframes shimmer {
          to {
            rotate: 360deg;
          }
        }

        @keyframes breathe {
          from, to {
            scale: 1;
          }
          50% {
            scale: 1.2;
          }
        }

        .shiny-cta-sm {
          padding: 0.55rem 1.35rem;
          font-size: 0.875rem;
        }
      `}</style>

      {"href" in props && props.href ? (
        <Link href={props.href} className={combinedClass}>
          {inner}
        </Link>
      ) : (
        <button
          type={(props as ShinyButtonAsButton).type ?? "button"}
          className={combinedClass}
          {...(props as ShinyButtonAsButton)}
        >
          {inner}
        </button>
      )}
    </>
  );
}

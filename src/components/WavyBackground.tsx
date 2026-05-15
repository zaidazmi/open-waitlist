"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
  children,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "slow",
  waveOpacity = 0.5,
}: {
  children?: React.ReactNode;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const sceneRef = useRef({
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    w: 0,
    h: 0,
    nt: 0,
  });
  const [useStaticFallback, setUseStaticFallback] = useState(false);
  const noise = useMemo(() => createNoise3D(), []);
  const waveColors = useMemo(
    () =>
      colors ?? [
        "#25f2b8",
        "#f6c466",
        "#4ea7ff",
        "#f7f1d0",
        "#0f766e",
      ],
    [colors],
  );

  const getSpeed = useCallback(() => {
    switch (speed) {
      case "slow":
        return 0.001;
      case "fast":
        return 0.002;
      default:
        return 0.001;
    }
  }, [speed]);

  const drawWave = useCallback((n: number) => {
    const { ctx, w, h } = sceneRef.current;
    if (!ctx) return;
    sceneRef.current.nt += getSpeed();
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.lineWidth = waveWidth || 50;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      for (let x = 0; x < w; x += 5) {
        const y = noise(x / 800, 0.3 * i, sceneRef.current.nt) * 100;
        ctx.lineTo(x, y + h * 0.5);
      }
      ctx.stroke();
      ctx.closePath();
    }
  }, [getSpeed, noise, waveColors, waveWidth]);

  const render = useCallback(function renderFrame() {
    const { ctx, w, h } = sceneRef.current;
    if (!ctx || !isVisibleRef.current) return;
    ctx.fillStyle = backgroundFill || "black";
    ctx.globalAlpha = waveOpacity;
    ctx.fillRect(0, 0, w, h);
    drawWave(5);
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [backgroundFill, drawWave, waveOpacity]);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const updateMode = () => {
      setUseStaticFallback(
        motionQuery.matches || mobileQuery.matches || pointerQuery.matches
      );
    };
    updateMode();

    motionQuery.addEventListener?.("change", updateMode);
    mobileQuery.addEventListener?.("change", updateMode);
    pointerQuery.addEventListener?.("change", updateMode);

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current && !animationFrameRef.current) {
        render();
      }
      if (!isVisibleRef.current && animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      motionQuery.removeEventListener?.("change", updateMode);
      mobileQuery.removeEventListener?.("change", updateMode);
      pointerQuery.removeEventListener?.("change", updateMode);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [render]);

  useEffect(() => {
    if (useStaticFallback) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const init = () => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const ctx = canvas.getContext("2d");
      if (!ctx) return undefined;
      sceneRef.current.canvas = canvas;
      sceneRef.current.ctx = ctx;
      sceneRef.current.w = ctx.canvas.width = window.innerWidth;
      sceneRef.current.h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
      sceneRef.current.nt = 0;

      const handleResize = () => {
        const currentCtx = sceneRef.current.ctx;
        if (!currentCtx) return;
        sceneRef.current.w = currentCtx.canvas.width = window.innerWidth;
        sceneRef.current.h = currentCtx.canvas.height = window.innerHeight;
        currentCtx.filter = `blur(${blur}px)`;
      };

      handleResize();
      window.addEventListener("resize", handleResize, { passive: true });
      render();

      return () => {
        window.removeEventListener("resize", handleResize);
        sceneRef.current.canvas = null;
        sceneRef.current.ctx = null;
      };
    };

    const cleanup = init();

    return () => {
      cleanup?.();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [blur, render, useStaticFallback]);

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
  }, []);

  if (useStaticFallback) {
    return (
      <>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background:
              "radial-gradient(circle at 50% 35%, rgba(37, 242, 184, 0.18) 0%, rgba(246, 196, 102, 0.08) 28%, rgba(5, 5, 5, 0) 68%)",
          }}
        />
        {children}
      </>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        id="canvas"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
        aria-hidden="true"
      />
      {children}
    </>
  );
};

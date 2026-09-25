"use client";

import React, { useEffect, useRef } from "react";

export default function HeroCanvas3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    // 3D Grid points definition
    const COLS = 32;
    const ROWS = 20;
    const SPACING = 55;

    let time = 0;

    const render = () => {
      time += 0.02;

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const fov = 350;
      const cameraZ = 450;
      const cameraY = -80 + (mouseY - height / 2) * 0.12;
      const cameraX = (mouseX - width / 2) * 0.15;

      const projectedPoints: { x: number; y: number; alpha: number; z: number }[][] = [];

      for (let r = 0; r < ROWS; r++) {
        projectedPoints[r] = [];
        for (let c = 0; c < COLS; c++) {
          const worldX = (c - COLS / 2) * SPACING - cameraX;
          const worldZ = r * SPACING + 100 - (time * 25) % SPACING;
          
          // Sine wave undulating wave in 3D
          const wave = Math.sin(c * 0.3 + time) * 22 + Math.cos(r * 0.4 + time * 0.8) * 18;
          const worldY = 220 + wave - cameraY;

          // 3D to 2D projection
          const scale = fov / (worldZ + cameraZ);
          const screenX = width / 2 + worldX * scale;
          const screenY = height / 2 + worldY * scale;
          const alpha = Math.max(0, Math.min(1, (1 - worldZ / (ROWS * SPACING)) * 0.6));

          projectedPoints[r][c] = { x: screenX, y: screenY, alpha, z: worldZ };
        }
      }

      // Draw grid lines
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const p = projectedPoints[r][c];

          // Draw horizontal connection
          if (c < COLS - 1) {
            const right = projectedPoints[r][c + 1];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${p.alpha * 0.2})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw vertical connection
          if (r < ROWS - 1) {
            const down = projectedPoints[r + 1][c];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(down.x, down.y);
            ctx.strokeStyle = `rgba(2, 132, 199, ${p.alpha * 0.16})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw luminous node points
          if (p.alpha > 0.2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, 2.5 * (1 - p.z / (ROWS * SPACING))), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(79, 70, 229, ${p.alpha * 0.6})`;
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.7,
      }}
    />
  );
}

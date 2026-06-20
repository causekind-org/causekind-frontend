"use client";

import { useEffect, useRef } from "react";

interface Props {
  className?: string;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  type: "heart" | "sphere";
  color: [number, number, number]; // RGB
  pulseSpeed: number;
  pulsePhase: number;
}

export function Interactive3dHero({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let H = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const N = 40; // Number of floating items
    const particles: Particle3D[] = [];

    const colors: [number, number, number][] = [
      [176, 74, 21],  // terracotta #b04a15
      [224, 123, 58],  // copper #e07b3a
      [245, 158, 11],  // amber-gold #f59e0b
      [30, 58, 96],    // deep blue #1e3a60
    ];

    // Initialize 3D particles
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * W - W / 2,
        y: Math.random() * H - H / 2,
        z: Math.random() * 800 + 100, // Depth from 100 to 900
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.3 - 0.1, // Drifts forward slowly
        size: Math.random() * 45 + 35,
        type: "sphere",
        color: colors[Math.floor(Math.random() * colors.length)],
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + size / 4);
      ctx.quadraticCurveTo(x, y - size / 2, x + size / 2, y - size / 2);
      ctx.quadraticCurveTo(x + size, y - size / 2, x + size, y + size / 4);
      ctx.quadraticCurveTo(x + size, y + size * 0.7, x, y + size * 1.25);
      ctx.quadraticCurveTo(x - size, y + size * 0.7, x - size, y + size / 4);
      ctx.quadraticCurveTo(x - size, y - size / 2, x - size / 2, y - size / 2);
      ctx.quadraticCurveTo(x, y - size / 2, x, y + size / 4);
      ctx.closePath();
    };

    const tick = () => {
      // Clear with very slight fade for trailing effect
      ctx.fillStyle = "rgba(18, 12, 4, 0.08)"; // Dark background matching hero
      ctx.fillRect(0, 0, W, H);

      // Smooth mouse interpolation for premium look
      mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
      mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;

      // Parallax offsets
      const offsetX = mouse.current.x * 0.15;
      const offsetY = mouse.current.y * 0.15;

      // Sort by depth (Z) back-to-front for proper 3D rendering order
      particles.sort((a, b) => b.z - a.z);

      const fov = 400; // Camera field of view/lens depth
      const cx = W / 2;
      const cy = H / 2;

      for (const p of particles) {
        // Update physics
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap around Z bounds
        if (p.z <= 0) p.z = 900;
        if (p.z > 950) p.z = 100;

        // Wrap around X/Y bounds relative to perspective field
        const boundX = (W / 2) * (p.z / fov);
        const boundY = (H / 2) * (p.z / fov);

        if (p.x < -boundX) p.x = boundX;
        if (p.x > boundX) p.x = -boundX;
        if (p.y < -boundY) p.y = boundY;
        if (p.y > boundY) p.y = -boundY;

        // 3D Perspective Projection
        // Calculate projected coordinate on 2D screen
        const scale = fov / (fov + p.z);
        const projX = (p.x + offsetX) * scale + cx;
        const projY = (p.y + offsetY) * scale + cy;
        const projR = p.size * scale;

        // Skip drawing if off-screen
        if (projX < -projR || projX > W + projR || projY < -projR || projY > H + projR) {
          continue;
        }

        // Draw particle
        p.pulsePhase += p.pulseSpeed;
        const currentSize = projR * (1 + Math.sin(p.pulsePhase) * 0.08);
        const alpha = Math.min(1.0, scale * 1.5) * (1 - p.z / 950);

        const [r, g, b] = p.color;

        ctx.save();
        ctx.shadowBlur = currentSize * 0.8;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;

        if (p.type === "sphere") {
          // 3D Shading using Radial Gradient
          const grad = ctx.createRadialGradient(
            projX - currentSize * 0.3,
            projY - currentSize * 0.3,
            currentSize * 0.1,
            projX,
            projY,
            currentSize
          );
          grad.addColorStop(0, `rgba(${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)}, ${alpha})`);
          grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          grad.addColorStop(1, `rgba(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)}, 0.1)`);

          ctx.beginPath();
          ctx.arc(projX, projY, currentSize, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          // 3D Shading for Heart shape
          drawHeart(ctx, projX, projY - currentSize / 2, currentSize);
          
          const grad = ctx.createLinearGradient(
            projX - currentSize,
            projY - currentSize,
            projX + currentSize,
            projY + currentSize
          );
          grad.addColorStop(0, `rgba(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)}, ${alpha})`);
          grad.addColorStop(1, `rgba(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)}, ${alpha * 0.2})`);

          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
      }

      raf.current = requestAnimationFrame(tick);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse coords (-1 to 1)
      mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const handleResize = () => {
      W = canvas.width = canvas.offsetWidth || window.innerWidth;
      H = canvas.height = canvas.offsetHeight || window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);

    tick();

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    />
  );
}

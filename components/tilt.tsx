"use client";
import { useRef } from "react";

/** Gentle 3D tilt that follows the pointer. Off for touch and reduced-motion users. */
export function Tilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const off = () => matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches;
  return (
    <div
      ref={ref}
      className={`transition-transform duration-200 ease-out ${className}`}
      onPointerMove={(e) => {
        if (off() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg)`;
      }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = ""; }}
    >
      {children}
    </div>
  );
}

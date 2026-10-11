"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "./icons";

const KEY = "prd-doctor:theme";
const subscribe = (cb: () => void) => { window.addEventListener("prd-theme", cb); return () => window.removeEventListener("prd-theme", cb); };
const isDark = () => document.documentElement.dataset.theme === "dark";

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem(KEY, next); } catch {}
        window.dispatchEvent(new Event("prd-theme"));
      }}
      className="no-print btn-line grid size-9 place-items-center text-ink2"
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}

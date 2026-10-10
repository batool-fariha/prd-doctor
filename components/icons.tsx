// Small bold-stroke icon set (2px, round caps). Kept inline to avoid an icon dependency.
type P = React.SVGProps<SVGSVGElement>;
const base = (p: P) => ({ width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });

export const ArrowRight = (p: P) => <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const Share = (p: P) => <svg {...base(p)}><path d="M12 15V4M7 9l5-5 5 5M5 14v5h14v-5" /></svg>;
export const Download = (p: P) => <svg {...base(p)}><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>;
export const Copy = (p: P) => <svg {...base(p)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>;
export const Check = (p: P) => <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const Plus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const Minus = (p: P) => <svg {...base(p)}><path d="M5 12h14" /></svg>;
export const Upload = (p: P) => <svg {...base(p)}><path d="M12 16V5M7 10l5-5 5 5M5 20h14" /></svg>;
export const Printer = (p: P) => <svg {...base(p)}><path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M8 14h8v6H8z" /></svg>;
export const Pencil = (p: P) => <svg {...base(p)}><path d="M5 19l1-4L16.5 4.5a2 2 0 0 1 3 3L9 18l-4 1zM14 7l3 3" /></svg>;
export const File = (p: P) => <svg {...base(p)}><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" /></svg>;

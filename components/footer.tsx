import { Code, Github, Linkedin } from "./icons";
import { LogoMark } from "./logo";
import { SITE } from "@/lib/site";

const link = "btn-line inline-grid size-10 place-items-center text-ink2 hover:text-[#17132B]";

export function Footer() {
  return (
    <footer className="no-print mt-auto border-t bg-surface/40 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-8">
        <div>
          <span className="serif flex items-center gap-2.5 text-lg"><LogoMark size={20} />{SITE.name}</span>
          <p className="mt-2 text-sm text-ink2">
            Designed and built by <a href={SITE.linkedin} target="_blank" rel="noopener noreferrer" className="underline decoration-[#C9B8FF] underline-offset-4 hover:decoration-[#6D4AFF]">{SITE.author}</a>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Free, no account. Your PRD never leaves your browser.</p>
        </div>
        <nav aria-label="Author links" className="flex items-center gap-2">
          <a href={SITE.github} target="_blank" rel="noopener noreferrer" className={link} aria-label="Fariha Batool on GitHub" title="GitHub"><Github className="size-[18px]" /></a>
          <a href={SITE.linkedin} target="_blank" rel="noopener noreferrer" className={link} aria-label="Fariha Batool on LinkedIn" title="LinkedIn"><Linkedin className="size-[18px]" /></a>
          <a href={SITE.repo} target="_blank" rel="noopener noreferrer" className={link} aria-label="PRD Doctor source code" title="Source code"><Code className="size-[18px]" /></a>
        </nav>
      </div>
    </footer>
  );
}

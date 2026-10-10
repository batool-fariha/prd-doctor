import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center border-b py-5"><Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link></header>
      <section className="rise max-w-xl py-24">
        <p className="eyebrow mb-4">404</p>
        <h1 className="serif text-5xl leading-[1.06]">This page doesn&apos;t exist.</h1>
        <p className="mt-5 text-[15px] text-[#3B3650]">The link may be mistyped or out of date. Your PRD is a better use of the next minute anyway.</p>
        <Link href="/" className="btn-solid mt-8 inline-flex h-10 items-center px-5 text-sm font-medium">Analyze a PRD</Link>
      </section>
    </main>
  );
}

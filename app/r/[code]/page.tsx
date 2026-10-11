import type { Metadata } from "next";
import { decodeShort, encodePayload } from "@/lib/analyzer";
import { ResultView } from "@/components/result-view";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const p = decodeShort(code);
  if (!p) return { title: { absolute: "PRD Doctor result" } };
  const img = `/api/og?s=${encodePayload(p)}`;
  const title = `My PRD scored ${p.o}/100 on PRD Doctor`;
  return { title: { absolute: title }, openGraph: { title, images: [img] }, twitter: { card: "summary_large_image", title, images: [img] } };
}

/** Public short link: scores only, readable on any device. */
export default async function SharedScorePage({ params }: Props) {
  const { code } = await params;
  const p = decodeShort(code);
  return <ResultView id={`r-${code}`} shared={p ? encodePayload(p) : "invalid"} />;
}

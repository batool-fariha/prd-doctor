// Accessibility audit with axe-core (a dev dependency). Not part of `npm test`: it needs a real browser.
//
//   npm run build && npx next start -p 3142
//   (cd node_modules/axe-core && python3 -m http.server 3143 --bind 127.0.0.1)
//
// Open a page at http://localhost:3142, paste this file into the browser console, and read the result.
// It turns CSS transitions off first, because a colour caught mid-fade is reported as a contrast failure.
// Run it once in each theme (use the toggle in the header) and on: /, a result page, /how-scoring-works, /r/<code>.
(async () => {
  if (!window.axe) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "http://127.0.0.1:3143/axe.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load axe-core. Is the static server on port 3143 running?"));
      document.head.appendChild(s);
    });
  }
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
  document.head.appendChild(style);
  document.querySelectorAll("details").forEach((d) => (d.open = true));
  await new Promise((r) => setTimeout(r, 500));
  const { violations } = await axe.run(document, { resultTypes: ["violations"] });
  console.log(`${location.pathname} (${document.documentElement.dataset.theme || "system theme"}): ${violations.length} violation(s)`);
  violations.forEach((v) => console.log(`- ${v.id} [${v.impact}] ${v.help}`, v.nodes.map((n) => n.target.join(" "))));
})();

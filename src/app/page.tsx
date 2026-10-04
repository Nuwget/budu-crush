import { GameRoot } from "@/app-shell/GameRoot";

export default function Page() {
  return (
    <>
      <GameRoot />
      <noscript>
        <p className="noscript">Dudu &amp; Bubu needs JavaScript to run. / Dudu &amp; Bubu precisa de JavaScript para funcionar.</p>
      </noscript>
    </>
  );
}

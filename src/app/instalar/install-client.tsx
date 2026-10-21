"use client";
import { useEffect, useRef, useState } from "react";

type Platform = "android" | "ios" | "desktop" | "unknown";
type InstallState = "idle" | "installing" | "installed" | "manual";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/macintosh|windows|linux/i.test(ua)) return "desktop";
  return "unknown";
}

// Ícone da plataforma
function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "android") return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24A9.82 9.82 0 0012 8c-1.65 0-3.2.43-4.47 1.13L5.65 5.87c-.19-.29-.56-.38-.86-.22-.3.16-.42.54-.26.85L6.4 9.48C4.35 10.87 3 13.07 3 15.6V16h18v-.4c0-2.53-1.35-4.73-3.4-6.12zM8.5 14a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z"/>
    </svg>
  );
  if (platform === "ios") return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M20 18h2v2H2v-2h2V4a1 1 0 011-1h14a1 1 0 011 1v14zm-2 0V5H6v13h12zm-6-4a3 3 0 110-6 3 3 0 010 6z"/>
    </svg>
  );
}

// Passos para iOS (não tem prompt nativo)
function IOSSteps() {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
      <p className="mb-4 font-semibold text-white">Como instalar no iPhone / iPad:</p>
      <ol className="space-y-3">
        <li className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chapa text-xs font-bold text-white">1</span>
          <span>Toque no botão <span className="font-semibold text-white">Compartilhar</span> (ícone de caixa com seta para cima) na barra do Safari</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chapa text-xs font-bold text-white">2</span>
          <span>Role para baixo e toque em <span className="font-semibold text-white">&ldquo;Adicionar à Tela de Início&rdquo;</span></span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chapa text-xs font-bold text-white">3</span>
          <span>Toque em <span className="font-semibold text-white">&ldquo;Adicionar&rdquo;</span> no canto superior direito</span>
        </li>
      </ol>
    </div>
  );
}

export function InstallClient() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    setPlatform(detectPlatform());

    // Verifica se já está instalado como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsAlreadyInstalled(true);
    }

    // Captura o evento de instalação (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      setInstallState("installing");
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === "accepted") {
        setInstallState("installed");
      } else {
        setInstallState("idle");
      }
    } else {
      // iOS ou sem suporte nativo — mostra instruções
      setInstallState("manual");
    }
  };

  const features = [
    { icon: "⚡", label: "Acesso instantâneo", desc: "Abre direto da tela inicial, sem precisar do navegador" },
    { icon: "📵", label: "Funciona offline", desc: "Continua operando mesmo sem conexão" },
    { icon: "🔔", label: "Experiência nativa", desc: "Interface em tela cheia, igual a um app nativo" },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-asfalto px-4 py-12">
      {/* Glow de fundo */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-chapa/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sinal/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Ícone do app */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-chapa shadow-2xl shadow-chapa/40">
            {/* Ícone de carro/placa */}
            <svg viewBox="0 0 48 48" className="h-12 w-12 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="16" width="36" height="16" rx="3" />
              <path d="M10 16l4-6h20l4 6" />
              <circle cx="14" cy="32" r="3" fill="currentColor" stroke="none" />
              <circle cx="34" cy="32" r="3" fill="currentColor" stroke="none" />
              <rect x="15" y="20" width="18" height="8" rx="1.5" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Emplacamento SESÉ</h1>
            <p className="mt-1 text-sm text-white/50">Sistema de Controle de Emplacamento</p>
          </div>
        </div>

        {/* Card principal */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">

          {isAlreadyInstalled ? (
            // Já instalado
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/20 text-3xl">✅</div>
              <div>
                <p className="text-lg font-semibold text-white">App já instalado!</p>
                <p className="mt-1 text-sm text-white/50">Você já está usando o app instalado.</p>
              </div>
              <a
                href="/operador"
                className="mt-2 w-full rounded-xl bg-chapa py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-chapa/30 transition-all duration-200 hover:bg-chapa-700 active:scale-[0.98] block"
              >
                Abrir o sistema
              </a>
            </div>
          ) : installState === "installed" ? (
            // Acabou de instalar
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/20 text-3xl">🎉</div>
              <div>
                <p className="text-lg font-semibold text-white">Instalado com sucesso!</p>
                <p className="mt-1 text-sm text-white/50">O app foi adicionado à sua tela inicial.</p>
              </div>
              <a
                href="/operador"
                className="mt-2 w-full rounded-xl bg-chapa py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-chapa/30 transition-all duration-200 hover:bg-chapa-700 active:scale-[0.98] block"
              >
                Abrir o sistema
              </a>
            </div>
          ) : (
            <>
              <p className="mb-5 text-center text-sm text-white/60">
                Instale o app no seu dispositivo para acessar de forma rápida, mesmo sem internet.
              </p>

              {/* Funcionalidades */}
              <ul className="mb-6 space-y-3">
                {features.map((f) => (
                  <li key={f.label} className="flex items-start gap-3">
                    <span className="text-xl leading-none">{f.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.label}</p>
                      <p className="text-xs text-white/50">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Botão principal */}
              {installState !== "manual" && (
                <button
                  id="btn-instalar"
                  onClick={handleInstall}
                  disabled={installState === "installing"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-chapa py-3.5 text-sm font-bold text-white shadow-lg shadow-chapa/30 transition-all duration-200 hover:bg-chapa-700 hover:shadow-chapa/50 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]"
                >
                  {installState === "installing" ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Instalando…
                    </>
                  ) : (
                    <>
                      <PlatformIcon platform={platform} />
                      Instalar agora
                    </>
                  )}
                </button>
              )}

              {/* Instruções iOS */}
              {(platform === "ios" || installState === "manual") && <IOSSteps />}

              {/* Info de tamanho */}
              <p className="mt-4 text-center text-xs text-white/30">
                Gratuito · Sem necessidade de loja de apps · ~1 MB
              </p>
            </>
          )}
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-white/25">
          Grupo SESÉ · Sistema interno de emplacamento
        </p>
      </div>
    </main>
  );
}

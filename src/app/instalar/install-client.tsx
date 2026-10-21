"use client";
import { useEffect, useRef, useState } from "react";

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

// ─── Ícone do app ───────────────────────────────────────────────────────────
function AppIcon() {
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-[26px] bg-chapa shadow-2xl shadow-chapa/50">
      <svg viewBox="0 0 48 48" className="h-14 w-14 text-white" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="16" width="36" height="16" rx="3" />
        <path d="M10 16l4-6h20l4 6" />
        <circle cx="14" cy="32" r="3" fill="currentColor" stroke="none" />
        <circle cx="34" cy="32" r="3" fill="currentColor" stroke="none" />
        <rect x="15" y="20" width="18" height="8" rx="1.5" strokeWidth="2" />
      </svg>
    </div>
  );
}

// ─── Passo numerado ──────────────────────────────────────────────────────────
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chapa text-xs font-bold text-white">
        {n}
      </span>
      <span className="text-sm text-white/80 leading-relaxed">{children}</span>
    </li>
  );
}

// ─── Instruções Android ──────────────────────────────────────────────────────
function AndroidSteps({ onNativeInstall, canNative }: {
  onNativeInstall: () => void;
  canNative: boolean;
}) {
  return (
    <div className="space-y-5">
      {canNative ? (
        /* Chrome com prompt nativo disponível */
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/70 text-center">
            Clique no botão abaixo para instalar o app direto na tela inicial do seu celular.
          </p>
          <button
            id="btn-instalar-android"
            onClick={onNativeInstall}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-chapa py-4 text-sm font-bold text-white shadow-lg shadow-chapa/40 transition-all hover:bg-chapa-700 active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24A9.82 9.82 0 0012 8c-1.65 0-3.2.43-4.47 1.13L5.65 5.87c-.19-.29-.56-.38-.86-.22-.3.16-.42.54-.26.85L6.4 9.48C4.35 10.87 3 13.07 3 15.6V16h18v-.4c0-2.53-1.35-4.73-3.4-6.12zM8.5 14a1 1 0 110-2 1 1 0 010 2zm7 0a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            Instalar agora
          </button>
        </div>
      ) : (
        /* Sem prompt nativo — instruções manuais Chrome Android */
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-4 font-semibold text-white text-sm">Como instalar no Android:</p>
          <ol className="space-y-4">
            <Step n={1}>
              Toque nos <strong className="text-white">três pontinhos ⋮</strong> no canto superior direito do Chrome
            </Step>
            <Step n={2}>
              Toque em <strong className="text-white">&ldquo;Adicionar à tela inicial&rdquo;</strong>
            </Step>
            <Step n={3}>
              Toque em <strong className="text-white">&ldquo;Instalar&rdquo;</strong> na caixa que aparecer
            </Step>
          </ol>
          <div className="mt-4 rounded-xl bg-sinal/10 border border-sinal/20 px-3 py-2">
            <p className="text-xs text-sinal/90">💡 Use o Chrome para instalar. Outros navegadores podem não suportar.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Instruções iOS ──────────────────────────────────────────────────────────
function IOSSteps() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="mb-4 font-semibold text-white text-sm">Como instalar no iPhone / iPad:</p>
      <ol className="space-y-4">
        <Step n={1}>
          Toque no ícone de <strong className="text-white">Compartilhar</strong>{" "}
          <span className="inline-block rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white">↑</span>{" "}
          na barra inferior do Safari
        </Step>
        <Step n={2}>
          Role para baixo e toque em{" "}
          <strong className="text-white">&ldquo;Adicionar à Tela de Início&rdquo;</strong>
        </Step>
        <Step n={3}>
          Toque em <strong className="text-white">&ldquo;Adicionar&rdquo;</strong>{" "}
          no canto superior direito
        </Step>
      </ol>
      <div className="mt-4 rounded-xl bg-sinal/10 border border-sinal/20 px-3 py-2">
        <p className="text-xs text-sinal/90">💡 Use o Safari. Outros navegadores do iPhone não permitem instalação.</p>
      </div>
    </div>
  );
}

// ─── Instruções Desktop ──────────────────────────────────────────────────────
function DesktopSteps({ onNativeInstall, canNative }: {
  onNativeInstall: () => void;
  canNative: boolean;
}) {
  return (
    <div className="space-y-4">
      {canNative ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/70 text-center">
            Instale o app no seu computador para acesso rápido sem precisar do navegador.
          </p>
          <button
            id="btn-instalar-desktop"
            onClick={onNativeInstall}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-chapa py-4 text-sm font-bold text-white shadow-lg shadow-chapa/40 transition-all hover:bg-chapa-700 active:scale-[0.98]"
          >
            Instalar no computador
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-4 font-semibold text-white text-sm">Como instalar no computador:</p>
          <ol className="space-y-4">
            <Step n={1}>
              Na barra de endereço do Chrome, clique no ícone de{" "}
              <strong className="text-white">computador com seta ⊕</strong> no lado direito
            </Step>
            <Step n={2}>
              Clique em <strong className="text-white">&ldquo;Instalar&rdquo;</strong>
            </Step>
          </ol>
          <div className="mt-4 rounded-xl bg-sinal/10 border border-sinal/20 px-3 py-2">
            <p className="text-xs text-sinal/90">💡 Disponível no Chrome e Edge. Não disponível no Firefox ou Safari.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function InstallClient() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [canNative, setCanNative] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = useRef<any>(null);

  useEffect(() => {
    setPlatform(detectPlatform());

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setAlreadyInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      prompt.current = e;
      setCanNative(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleNativeInstall = async () => {
    if (!prompt.current) return;
    prompt.current.prompt();
    const { outcome } = await prompt.current.userChoice;
    prompt.current = null;
    setCanNative(false);
    if (outcome === "accepted") setInstalled(true);
  };

  const features = [
    { icon: "⚡", text: "Abre direto da tela inicial, sem precisar do navegador" },
    { icon: "📶", text: "Funciona mesmo com internet lenta ou instável" },
    { icon: "🖥️", text: "Interface em tela cheia, sem barra do navegador" },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-asfalto px-4 py-12">
      {/* Glows de fundo */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-chapa/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-sinal/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center gap-4 text-center">
          <AppIcon />
          <div>
            <h1 className="text-2xl font-bold text-white">Emplacamento SESÉ</h1>
            <p className="mt-1 text-sm text-white/50">Sistema de Controle de Emplacamento</p>
          </div>
        </div>

        {/* Estado: já instalado */}
        {alreadyInstalled && (
          <div className="rounded-3xl border border-ok/30 bg-ok/10 p-6 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="font-semibold text-white">App já está instalado!</p>
            <p className="text-sm text-white/50">Você já está usando o app instalado no dispositivo.</p>
            <a href="/operador"
              className="block w-full rounded-xl bg-chapa py-3.5 text-sm font-bold text-white text-center shadow-lg shadow-chapa/30 hover:bg-chapa-700 transition-all">
              Abrir o sistema
            </a>
          </div>
        )}

        {/* Estado: recém instalado */}
        {installed && !alreadyInstalled && (
          <div className="rounded-3xl border border-ok/30 bg-ok/10 p-6 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <p className="font-semibold text-white">Instalado com sucesso!</p>
            <p className="text-sm text-white/50">O app foi adicionado à sua tela inicial.</p>
            <a href="/operador"
              className="block w-full rounded-xl bg-chapa py-3.5 text-sm font-bold text-white text-center shadow-lg shadow-chapa/30 hover:bg-chapa-700 transition-all">
              Abrir o sistema
            </a>
          </div>
        )}

        {/* Estado normal: mostrar instruções */}
        {!alreadyInstalled && !installed && (
          <>
            {/* Card de benefícios */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="mb-4 text-center text-sm font-semibold text-white">
                📲 Instale o app no seu dispositivo
              </p>
              <ul className="space-y-3">
                {features.map((f) => (
                  <li key={f.icon} className="flex items-start gap-3 text-sm text-white/70">
                    <span className="text-base leading-none">{f.icon}</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instruções por plataforma */}
            {platform === "android" && (
              <AndroidSteps onNativeInstall={handleNativeInstall} canNative={canNative} />
            )}
            {platform === "ios" && <IOSSteps />}
            {platform === "desktop" && (
              <DesktopSteps onNativeInstall={handleNativeInstall} canNative={canNative} />
            )}

            <p className="text-center text-xs text-white/25">
              Gratuito · Sem loja de apps · Grupo SESÉ
            </p>
          </>
        )}
      </div>
    </main>
  );
}

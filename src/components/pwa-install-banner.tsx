"use client";
import { useEffect, useRef, useState } from "react";

type Platform = "android" | "ios" | "other";

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [showIOSHint, setShowIOSHint] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    // Não mostra se já está instalado como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Não mostra se o usuário já dispensou
    if (sessionStorage.getItem("pwa-banner-dismissed")) return;

    const plat = getPlatform();
    setPlatform(plat);

    if (plat === "ios") {
      // iOS: mostra o banner manualmente (não tem evento nativo)
      // Só aparece em Safari (iOS Chrome não suporta instalação)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) setVisible(true);
      return;
    }

    // Android / Desktop Chrome/Edge: aguarda o evento
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setShowIOSHint(true);
      return;
    }
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    if (outcome === "accepted") setVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-banner-dismissed", "1");
    setVisible(false);
    setShowIOSHint(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Banner principal */}
      <div
        role="dialog"
        aria-label="Instalar aplicativo"
        className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-asfalto shadow-2xl px-4 py-3">
          {/* Ícone */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-chapa shadow-lg shadow-chapa/40">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="8" width="18" height="8" rx="1.5" />
              <path d="M5 8l2-3h10l2 3" />
              <circle cx="7" cy="16" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="17" cy="16" r="1.5" fill="currentColor" stroke="none" />
              <rect x="7.5" y="10" width="9" height="4" rx="0.75" strokeWidth="1.8" />
            </svg>
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">Instalar o app</p>
            <p className="text-xs text-white/50 leading-tight mt-0.5">Acesso rápido na tela inicial</p>
          </div>

          {/* Botões */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              aria-label="Fechar"
              className="text-xs text-white/40 hover:text-white/70 transition-colors px-1 py-1"
            >
              ✕
            </button>
            <button
              id="btn-pwa-instalar"
              onClick={handleInstall}
              className="rounded-lg bg-chapa px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-chapa/30 hover:bg-chapa-700 active:scale-[0.97] transition-all"
            >
              Instalar
            </button>
          </div>
        </div>

        {/* Dica para iOS */}
        {showIOSHint && (
          <div className="mt-2 rounded-xl border border-white/10 bg-asfalto-700 px-4 py-3 text-xs text-white/80 shadow-xl">
            <p className="font-semibold text-white mb-1.5">Como instalar no iPhone / iPad:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Toque em <strong className="text-white">Compartilhar</strong> (ícone ↑ no Safari)</li>
              <li>Escolha <strong className="text-white">&ldquo;Adicionar à Tela de Início&rdquo;</strong></li>
              <li>Toque em <strong className="text-white">&ldquo;Adicionar&rdquo;</strong></li>
            </ol>
            <button
              onClick={handleDismiss}
              className="mt-2 text-white/40 hover:text-white/70 text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* Overlay escuro suave atrás da dica iOS */}
      {showIOSHint && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40"
          onClick={handleDismiss}
        />
      )}
    </>
  );
}

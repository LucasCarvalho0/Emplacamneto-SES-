"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export function PwaInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Não mostra se já é PWA instalado
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Não mostra se já foi dispensado nesta sessão
    if (sessionStorage.getItem("pwa-dismissed")) return;
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3">
      <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/15 bg-asfalto px-4 py-3 shadow-2xl">
        {/* Ícone */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-chapa">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>
        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white leading-tight">Instale o app no seu celular</p>
          <p className="text-xs text-white/50 leading-tight">Acesso rápido e offline</p>
        </div>
        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { sessionStorage.setItem("pwa-dismissed", "1"); setShow(false); }}
            className="px-2 py-1 text-xs text-white/40 hover:text-white/70 transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
          <Link
            href="/instalar"
            className="rounded-lg bg-chapa px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-chapa-700 active:scale-[0.97] transition-all"
          >
            Instalar
          </Link>
        </div>
      </div>
    </div>
  );
}

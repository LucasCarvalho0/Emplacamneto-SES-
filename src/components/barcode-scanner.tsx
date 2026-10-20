"use client";
import { useEffect, useRef, useState } from "react";

type Status = "loading" | "active" | "error";

/**
 * Lê Code 128, Code 39 e Data Matrix pela câmera traseira.
 * Estratégia:
 *  1. Abre a câmera com getUserMedia (controle total sobre o <video>)
 *  2. Usa BarcodeDetector nativo se disponível (Chrome/Android ≥ 83)
 *  3. Cai para @zxing/browser caso contrário
 */
export function BarcodeScanner({ onDetect }: { onDetect: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handler = useRef(onDetect);
  handler.current = onDetect;
  const last = useRef({ text: "", at: 0 });
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let stopDetection: (() => void) | undefined;

    const emit = (text: string) => {
      const now = Date.now();
      if (text === last.current.text && now - last.current.at < 2500) return;
      last.current = { text, at: now };
      handler.current(text);
    };

    (async () => {
      try {
        // 1. Pede acesso à câmera traseira
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        // 2. Conecta o stream ao elemento <video>
        const video = videoRef.current!;
        video.srcObject = stream;
        // Aguarda o vídeo começar a reproduzir
        await video.play().catch(() => {});

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        setStatus("active");

        // 3a. BarcodeDetector nativo (Chrome 83+, Edge, Android Chrome)
        if ("BarcodeDetector" in window) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const detector = new (window as any).BarcodeDetector({
            formats: ["code_128", "code_39", "data_matrix", "qr_code", "ean_13", "ean_8"],
          });

          let raf: number;
          const tick = async () => {
            if (cancelled) return;
            if (video.readyState >= 2) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const codes: any[] = await detector.detect(video);
                if (codes.length > 0) emit(codes[0].rawValue as string);
              } catch { /* frame ainda não pronto, ignora */ }
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          stopDetection = () => cancelAnimationFrame(raf);

        } else {
          // 3b. Fallback: @zxing/browser
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);

          if (cancelled) return;

          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.DATA_MATRIX,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);

          const reader = new BrowserMultiFormatReader(hints);
          // decodeFromVideoElement usa o <video> já iniciado — evita conflito de stream
          const controls = await reader.decodeFromVideoElement(video, (result) => {
            if (result) emit(result.getText());
          });
          stopDetection = () => controls.stop();
        }
      } catch (e) {
        if (!cancelled) {
          const name = e instanceof Error ? e.name : "";
          setErrorMsg(
            name === "NotAllowedError"
              ? "A câmera foi bloqueada. Libere o acesso nas configurações do navegador e recarregue."
              : "Não foi possível abrir a câmera. Use a digitação manual abaixo.",
          );
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      stopDetection?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <div className="relative overflow-hidden rounded-md bg-asfalto">
        {/* Indicador de carregamento */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <svg
              className="h-6 w-6 animate-spin text-sinal"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <p className="text-sm text-white/60">Iniciando câmera…</p>
          </div>
        )}

        {/* Elemento de vídeo — autoPlay é essencial para o stream aparecer */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="aspect-[4/3] w-full object-cover"
        />

        {/* Mira de leitura */}
        {status === "active" && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 bg-sinal shadow-[0_0_8px_2px] shadow-sinal/60"
            />
            {/* Cantos da mira */}
            <div aria-hidden className="pointer-events-none absolute left-6 top-[30%] h-5 w-5 border-l-2 border-t-2 border-sinal" />
            <div aria-hidden className="pointer-events-none absolute right-6 top-[30%] h-5 w-5 border-r-2 border-t-2 border-sinal" />
            <div aria-hidden className="pointer-events-none absolute bottom-[30%] left-6 h-5 w-5 border-b-2 border-l-2 border-sinal" />
            <div aria-hidden className="pointer-events-none absolute bottom-[30%] right-6 h-5 w-5 border-b-2 border-r-2 border-sinal" />
          </>
        )}
      </div>

      {errorMsg && (
        <p role="alert" className="mt-3 rounded border border-erro bg-erro-100 px-3 py-2 text-sm text-erro">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

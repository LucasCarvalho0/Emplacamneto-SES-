"use client";
import { useEffect, useRef } from "react";

/**
 * Detecta leitura de coletor de código de barras HID (modo teclado).
 *
 * Coletores HID digitam os caracteres muito mais rápido do que humanos
 * (< 50 ms entre teclas) e terminam com Enter. Este hook usa essa
 * diferença para distinguir "usuário digitando" de "scanner disparou".
 *
 * Quando o buffer de caracteres chega ao Enter em alta velocidade,
 * chama onScan(code). O threshold padrão é 50 ms entre teclas.
 */
export function useHidScanner(
  onScan: (code: string) => void,
  { minLength = 6, maxGapMs = 50 }: { minLength?: number; maxGapMs?: number } = {},
) {
  const buffer = useRef<string[]>([]);
  const lastKey = useRef<number>(0);
  const handler = useRef(onScan);
  handler.current = onScan;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignora se o foco está em um campo de texto — não intercepta digitação normal
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now = Date.now();
      const gap = now - lastKey.current;
      lastKey.current = now;

      if (e.key === "Enter") {
        const code = buffer.current.join("");
        buffer.current = [];
        if (code.length >= minLength) {
          handler.current(code);
        }
        return;
      }

      // Se a pausa entre teclas foi muito longa, reinicia o buffer
      if (gap > maxGapMs && buffer.current.length > 0) {
        buffer.current = [];
      }

      // Só acumula caracteres imprimíveis (evita Shift, Ctrl, etc.)
      if (e.key.length === 1) {
        buffer.current.push(e.key.toUpperCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [minLength, maxGapMs]);
}

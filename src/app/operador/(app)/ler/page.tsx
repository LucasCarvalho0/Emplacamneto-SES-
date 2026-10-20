import { ScanFlow } from "@/components/scan-flow";

export const metadata = { title: "Ler código de barras" };

export default function ScanPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Ler código de barras</h1>
      <ScanFlow />
    </>
  );
}

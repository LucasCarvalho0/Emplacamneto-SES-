import type { Metadata } from "next";
import { InstallClient } from "./install-client";

export const metadata: Metadata = {
  title: "Instalar App · Emplacamento SESÉ",
  description: "Instale o aplicativo Emplacamento SESÉ no seu dispositivo para acesso rápido e offline.",
};

export default function InstalarPage() {
  return <InstallClient />;
}

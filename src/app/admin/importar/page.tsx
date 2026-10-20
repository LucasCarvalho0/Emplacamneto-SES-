import { ImportWizard } from "@/components/import-wizard";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Importar OS" };

export default function ImportPage() {
  return (
    <>
      <PageTitle title="Importar ordem de serviço" />
      <ImportWizard />
    </>
  );
}

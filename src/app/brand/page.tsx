import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BrandPreview } from "@/components/ui/BrandPreview";

export const metadata = { title: "Marke" };

// Vorschau der Marke Mia – nur im Testmodus (KUECHENHELFER_MOCK=1)
async function Gate() {
  await connection();
  if (process.env.KUECHENHELFER_MOCK !== "1") notFound();
  return <BrandPreview />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

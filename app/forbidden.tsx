import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Halaman ini terkunci</h1>
      <p className="max-w-sm text-muted-foreground">
        Kamu tidak boleh membuka halaman ini.
      </p>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Kembali ke halaman masuk
      </Link>
    </main>
  );
}

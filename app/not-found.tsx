import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-muted-foreground">Alamat ini tidak ada atau sudah dipindah.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Kembali ke beranda
      </Link>
    </main>
  );
}

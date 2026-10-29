import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-2xl font-extrabold text-primary-strong">Aksara</p>
      <h1 className="text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-muted-foreground">Alamat ini tidak ada atau sudah dipindah.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Kembali ke beranda
      </Link>
    </main>
  );
}

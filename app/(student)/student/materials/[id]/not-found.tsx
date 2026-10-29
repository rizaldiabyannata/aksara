import Link from "next/link";

export default function StudentMaterialNotFound() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Materi ini sedang diperbarui guru.</h1>
      <div>
        <Link
          href="/student/materials"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Kembali ke daftar materi
        </Link>
      </div>
    </div>
  );
}

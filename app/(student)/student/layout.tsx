import { Suspense } from "react";
import { StudentHeader, StudentNav } from "./student-header";

// Static shell only: pages guard themselves inside <Suspense>.
export default function StudentLayout({ children }: LayoutProps<"/student">) {
  return (
    <>
      <Suspense fallback={<StudentNav />}>
        <StudentHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </>
  );
}

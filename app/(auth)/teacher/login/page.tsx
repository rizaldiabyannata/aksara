import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight01Icon, HelpCircleIcon, TaskDone01Icon } from "@hugeicons/core-free-icons";
import { ClassroomIllustration } from "@/components/illustrations";
import { HugeiconsIcon } from "@hugeicons/react";
import { TeacherLoginForm } from "./teacher-login-form";

export const metadata: Metadata = { title: "Masuk Guru" };

export default function TeacherLoginPage() {
  return (
    <main className="w-full flex-1 relative overflow-hidden py-space-xl lg:py-space-2xl px-margin-mobile md:px-margin flex flex-col items-center justify-center">
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-canvas-peach-subtle/60 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-primary-fixed/40 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center relative z-10">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-space-md mb-space-xl pb-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary-container/20">
            <HugeiconsIcon icon={TaskDone01Icon} aria-hidden="true" className="size-7" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight">Aksara Guru</span>
            <p className="font-body-md text-body-md text-text-muted">Belajar dan ulangan untuk kelas VI</p>
          </div>
        </div>
        <Link
          className="group flex items-center gap-space-sm px-space-md py-2.5 min-h-11 rounded-xl bg-surface-card hover:bg-canvas-peach-subtle transition-all duration-200 shadow-sm text-brand-blue font-label-md text-label-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          href="/login"
        >
          <span>Masuk sebagai siswa</span>
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <div className="w-full lg:col-span-5 flex flex-col gap-space-lg order-2 lg:order-1">
            <div className="bg-surface-card rounded-2xl p-space-lg shadow-sm flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-xl bg-tone-warning-bg text-tone-warning flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={HelpCircleIcon} aria-hidden="true" className="size-[22px]" />
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-md text-label-md text-text-primary">Baru pertama kali masuk?</span>
                <p className="font-body-md text-body-md text-text-muted leading-relaxed">Anda akan diminta membuat kata sandi baru (minimal 12 karakter) sebelum memakai Aksara.</p>
              </div>
            </div>
            <ClassroomIllustration className="hidden h-auto w-full max-w-sm self-center lg:block" />
          </div>
          <div className="w-full lg:col-span-7 order-1 lg:order-2">
            <div className="bg-surface-card rounded-3xl p-space-xl sm:p-space-2xl shadow-[0_12px_36px_-4px_rgba(230,115,60,0.12)] flex flex-col gap-space-lg relative">
              <div className="flex flex-col gap-space-xs">
                <h1 className="font-headline-xl text-headline-xl text-text-primary font-bold">Masuk Guru</h1>
                <p className="font-body-lg text-body-lg text-text-muted">Masuk dengan username dan kata sandi guru.</p>
              </div>
              <TeacherLoginForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

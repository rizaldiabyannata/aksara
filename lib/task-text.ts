import type { TeacherTask } from "@/lib/dashboard";

/** One-line text and link for a dashboard task; shared by the dashboard cards and the topbar bell. */
export function taskLine(task: TeacherTask): { text: string; href: string } {
  switch (task.kind) {
    case "HELP":
      return { text: `${task.title}: ${task.students} siswa minta bantuan`, href: `/teacher/quizzes/${task.quizId}#pemantauan` };
    case "RUNNING":
      return { text: `${task.title}: ${task.inProgress} siswa sedang mengerjakan`, href: `/teacher/quizzes/${task.quizId}#pemantauan` };
    case "GRADE":
      return { text: `${task.title}: ${task.essays} jawaban uraian belum dinilai`, href: `/teacher/quizzes/${task.quizId}#pemantauan` };
    case "RELEASE":
      return { text: `${task.title}: semua sudah dinilai, siap dibagikan ke ${task.students} siswa`, href: `/teacher/quizzes/${task.quizId}#hasil` };
    case "OTHER_DEVICE":
      return { text: `${task.students} siswa masuk dari perangkat lain 7 hari terakhir`, href: "/teacher/students" };
    case "REVIEWED_MATERIALS":
      return { text: `${task.count} materi sudah ditinjau, belum diterbitkan`, href: "/teacher/materials?status=REVIEWED" };
  }
}

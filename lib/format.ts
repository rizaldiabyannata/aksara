const wita = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatWita = (d: Date): string => wita.format(d);

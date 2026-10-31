type PdfTextDocument = {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>;
};

export async function extractPageRange(doc: PdfTextDocument, first: number, last: number): Promise<string> {
  if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last < first || last > doc.numPages) {
    throw new Error("Rentang halaman tidak valid.");
  }
  const pages: string[] = [];
  for (let n = first; n <= last; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push(items.map((item) => {
      if (!item || typeof item !== "object" || !("str" in item) || typeof item.str !== "string") return "";
      return item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ");
    }).join("").trim());
  }
  const text = pages.filter(Boolean).join("\n\n");
  if (!text) throw new Error("Halaman ini tidak memiliki teks yang bisa diambil. Gunakan isian materi biasa.");
  if (text.length > 50000) throw new Error("Teks melebihi 50.000 huruf. Pilih rentang halaman yang lebih pendek.");
  return text;
}

import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ImageView, MaterialDetail } from "@/lib/materials";

const IMAGE_PREFIX = "aksara-image:";

// Shared by the teacher preview and the student page. No "use client": pure RSC markup.
export function Markdown({ source, images }: { source: string; images: ImageView[] }) {
  const byId = new Map(images.map((i) => [i.id, i]));
  return (
    <div className="space-y-3 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (url.startsWith(IMAGE_PREFIX) ? url : defaultUrlTransform(url))}
        components={{
          h1: ({ children }) => <h2 className="mt-6 text-xl font-semibold">{children}</h2>,
          h2: ({ children }) => <h3 className="mt-5 text-lg font-semibold">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-4 font-semibold">{children}</h4>,
          h4: ({ children }) => <h4 className="mt-4 font-semibold">{children}</h4>,
          h5: ({ children }) => <h4 className="mt-4 font-semibold">{children}</h4>,
          h6: ({ children }) => <h4 className="mt-4 font-semibold">{children}</h4>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 pl-4 text-muted-foreground">{children}</blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{children}</code>
          ),
          a: ({ href, children }) => (
            <a href={href} rel="noopener noreferrer" target="_blank" className="underline">
              {children}
            </a>
          ),
          img: ({ src, alt }) => renderImage(typeof src === "string" ? src : "", alt ?? "", byId),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

function renderImage(src: string, alt: string, byId: Map<string, ImageView>): ReactNode {
  if (!src.startsWith(IMAGE_PREFIX)) return <span>[Gambar: {alt}]</span>;
  const image = byId.get(src.slice(IMAGE_PREFIX.length));
  if (!image) return <span>[Gambar tidak tersedia]</span>;
  const note = [image.caption, image.sourceReference].filter(Boolean).join(" · ");
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route; next/image cannot optimize it */}
      <img
        src={`/api/images/${image.id}`}
        alt={alt || image.altText}
        width={image.width}
        height={image.height}
        loading="lazy"
        className="h-auto max-w-full"
      />
      {note && <span className="block text-sm text-muted-foreground">{note}</span>}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function MaterialView({ material }: { material: MaterialDetail }) {
  const { images } = material;
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">{material.title}</h1>
      <p className="text-muted-foreground">{material.summary}</p>
      <Section title="Materi">
        <Markdown source={material.content} images={images} />
      </Section>
      {!!material.examples && (
        <Section title="Contoh dan Aktivitas">
          <Markdown source={material.examples} images={images} />
        </Section>
      )}
      {!!material.exercises && (
        <Section title="Latihan">
          <Markdown source={material.exercises} images={images} />
        </Section>
      )}
      <p className="mt-8 text-sm text-muted-foreground">
        Sumber: {material.sourceReference}
        {material.sourcePages ? `, ${material.sourcePages}` : ""}
      </p>
    </article>
  );
}

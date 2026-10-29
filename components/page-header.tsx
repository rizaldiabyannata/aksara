export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        {eyebrow && <p className="text-xs font-bold tracking-wider text-primary-strong uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div data-slot="page-actions" className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

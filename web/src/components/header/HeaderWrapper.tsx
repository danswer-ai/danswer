export function HeaderWrapper({
  children,
}: {
  children: JSX.Element | string;
}) {
  return (
    <header className="border-b border-border dark:border-neutral-900 bg-background-emphasis dark:bg-background-strong-dark">
      <div className="mx-8 h-16">{children}</div>
    </header>
  );
}

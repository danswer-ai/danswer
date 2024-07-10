export function HeaderWrapper({
  children,
}: {
  children: JSX.Element | string;
}) {
  return (
    <header className="border-b border-border bg-background-emphasis">
      <div className="h-16 mx-6 md:mx-8">{children}</div>
    </header>
  );
}

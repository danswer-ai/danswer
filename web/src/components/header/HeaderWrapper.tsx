// import { HEADER_HEIGHT } from "@/lib/constants";

import { HEADER_HEIGHT } from "@/lib/constants";

export function HeaderWrapper({
  children,
}: {
  children: JSX.Element | string;
}) {
  return (
    <header className="border-b border-border bg-background-emphasis">
      <div className={`mx-8   ${HEADER_HEIGHT}`}>{children}</div>
    </header>
  );
}

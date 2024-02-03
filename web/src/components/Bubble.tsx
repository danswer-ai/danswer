export function Bubble({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: string | JSX.Element;
}) {
  return (
    <div
      className={
        `
      px-3 
      py-1
      rounded-lg 
      border
      border-border dark:border-neutral-900 
      w-fit 
      flex 
      cursor-pointer ` +
        (isSelected ? " bg-hover dark:bg-hover-dark" : " bg-background dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-600")
      }
      onClick={onClick}
    >
      <div className="my-auto">{children}</div>
    </div>
  );
}

export function MetadataBadge({
  icon,
  value,
}: {
  icon?: React.FC<{ size?: number; className?: string }>;
  value: string | JSX.Element;
}) {
  return (
    <div
      className={`
      text-xs 
      text-strong
      flex
      bg-hover 
      rounded-full 
      px-1
      py-0.5 
      w-fit 
      my-auto 
      select-none 
      `}
    >
      {icon && icon({ size: 12, className: "mr-0.5 my-auto" })}
      <div className="my-auto flex">{value}</div>
    </div>
  );
}

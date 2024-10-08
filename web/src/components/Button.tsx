interface Props {
  children: JSX.Element | string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const Button = ({
  children,
  onClick,
  type = "submit",
  disabled = false,
  fullWidth = false,
  className = "",
}: Props) => {
  const baseClasses =
    "group relative py-2 px-4 text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500";
  const widthClasses = fullWidth ? "w-full" : "";
  const colorClasses = disabled
    ? "bg-gray-400 cursor-not-allowed"
    : "bg-red-600 hover:bg-red-700";

  return (
    <button
      className={`${baseClasses} ${widthClasses} ${colorClasses} ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

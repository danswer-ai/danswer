export const Hoverable: React.FC<{
  onClick?: () => void;
  children: JSX.Element;
}> = ({ onClick, children }) => {
  return (
    <div
      className="hover:bg-hover p-1.5 rounded h-fit cursor-pointer"
      onClick={onClick}
    >
      {children}
    </div>
  );
};

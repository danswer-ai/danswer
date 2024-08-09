/* import { IconType } from "react-icons";

const ICON_SIZE = 15;

export const Hoverable: React.FC<{
  icon: IconType;
  onClick?: () => void;
  size?: number;
}> = ({ icon, onClick, size = ICON_SIZE }) => {
  return (
    <div
      className="hover:bg-hover p-1.5 rounded h-fit cursor-pointer"
      onClick={onClick}
    >
      {icon({ size: size, className: "my-auto" })}
    </div>
  );
}; */

export const Hoverable: React.FC<{
  onClick?: () => void;
  children: JSX.Element;
}> = ({ onClick, children }) => {
  return (
    <div
      className="hover:bg-hover p-1.5 rounded h-fit cursor-pointer"
      onClick={onClick}
      /* style={{ width: `${size}px`, height: `${size}px` }} */
    >
      {children}
    </div>
  );
};

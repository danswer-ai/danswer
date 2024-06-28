import { FiMenu } from "react-icons/fi";

export default function MobileHeaderToggle({ toggle }: { toggle: () => void }) {
  return (
    <div
      onClick={toggle}
      className="my-auto p-2 rounded cursor-pointer hover:bg-hover-light"
    >
      <FiMenu size={24} />
    </div>
  );
}

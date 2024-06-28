import { FiMenu } from "react-icons/fi";

export default function MobileHeaderToggle({ toggle }: { toggle: () => void }) {
  return (
    <div
      onClick={toggle}
      className="rounded cursor-pointer my-auto hover:bg-hover-light"
    >
      <FiMenu size={24} />
    </div>
  );
}

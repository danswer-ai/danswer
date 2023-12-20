export const CustomCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: () => void;
}) => {
  return (
    <label className="flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        onChange={onChange}
        readOnly={onChange ? false : true}
      />
      <span className="relative">
        <span
          className={`block w-3 h-3 border border-border-strong rounded ${
            checked ? "bg-green-700" : "bg-background"
          } transition duration-300`}
        >
          {checked && (
            <svg
              className="absolute top-0 left-0 w-3 h-3 fill-current text-inverted"
              viewBox="0 0 20 20"
            >
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          )}
        </span>
      </span>
    </label>
  );
};

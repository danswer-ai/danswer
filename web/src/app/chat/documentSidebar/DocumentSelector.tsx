export function DocumentSelector({
  isSelected,
  handleSelect,
}: {
  isSelected: boolean;
  handleSelect: () => void;
}) {
  return (
    <div
      className="ml-auto flex cursor-pointer select-none"
      onClick={handleSelect}
    >
      <p className="mr-2 my-auto">Select</p>
      <input
        className="my-auto"
        type="checkbox"
        checked={isSelected}
        // dummy function to prevent warning
        onChange={() => null}
      />
    </div>
  );
}

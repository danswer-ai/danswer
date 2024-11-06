export default function AssistantCategory({
  assistantCategory,
}: {
  assistantCategory: string;
}) {
  return (
    <div
      className="
      inline-flex
      items-center
      px-2.5
      py-0.5
      rounded-full
      text-xs
      font-medium
      bg-accent/10 
      text-accent
      border
      border-accent/20
      mt-3
      hover:bg-accent/20
      transition-colors
      duration-200
    "
    >
      {assistantCategory}
    </div>
  );
}

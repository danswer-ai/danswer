import { Persona } from "@/app/admin/personas/interfaces";
import { CustomDropdown, Dropdown } from "../Dropdown";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { FaRobot } from "react-icons/fa";

export function MoodSelector({
  moods,
  selectedMoodId,
  onMoodChange,
}: {
  moods: Persona[];
  selectedMoodId: number | null;
  onMoodChange: (mood: Persona) => void;
}) {
  const selectedMood = moods.find((mood) => mood.id === selectedMoodId);

  return (
    <CustomDropdown
      dropdown={
        <div
          className={`
      border 
      border-gray-800 
      rounded-lg 
      flex 
      flex-col 
      w-64 
      max-h-96 
      overflow-y-auto 
      overscroll-contain`}
        >
          {moods.map((mood, ind) => {
            const isSelected = mood.id === selectedMoodId;
            return (
              <div
                key={mood.id}
                className={`
                flex
                px-3 
                text-sm 
                text-gray-200 
                py-2.5 
                select-none 
                cursor-pointer 
                ${ind === moods.length - 1 ? "" : "border-b border-gray-800"} 
                ${
                  isSelected
                    ? "bg-dark-tremor-background-muted"
                    : "hover:bg-dark-tremor-background-muted "
                }
              `}
                onClick={(event) => {
                  onMoodChange(mood);
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                {mood.name}
                {isSelected && (
                  <div className="ml-auto mr-1">
                    <FiCheck />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    >
      <div className="text-sm flex hover:bg-dark-tremor-background-muted p-2 cursor-pointer">
        <FaRobot className="my-auto mr-2" />
        {selectedMood?.name || "Default"}{" "}
        <FiChevronDown className="my-auto ml-2" />
      </div>
    </CustomDropdown>
  );
}

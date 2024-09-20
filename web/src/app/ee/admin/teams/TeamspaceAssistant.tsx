import { Teamspace } from "@/lib/types";

interface TeamspaceAssistantProps {
  teamspace: Teamspace & { gradient: string };
}

export const TeamspaceAssistant = ({ teamspace }: TeamspaceAssistantProps) => {
  return (
    <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
      <h3>
        Assistant <span className="px-2 font-normal">|</span>{" "}
        {teamspace.assistants.length}
      </h3>
      {teamspace.assistants.length > 0 ? (
        <div className="pt-4 flex flex-wrap -space-x-3">
          {teamspace.assistants.map((assistant) => {
            return (
              <div
                key={assistant.id}
                className={`bg-primary w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg`}
              >
                {assistant.name!.charAt(0)}
              </div>
            );
          })}
        </div>
      ) : (
        <p>There are no asssitant.</p>
      )}
    </div>
  );
};

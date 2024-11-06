import {
  Persona,
  StarterMessage as StarterMessageType,
} from "../../app/admin/assistants/interfaces";

export function StarterMessages({
  currentPersona,
  onSubmit,
}: {
  currentPersona: Persona;
  onSubmit: (messageOverride: string) => void;
}) {
  return (
    <div
      key={-4}
      className={`
        mx-auto
        px-4
        w-full
        max-w-[750px]
        flex
        flex-wrap
        justify-center
        mt-6
        items-start
      `}
    >
      {currentPersona?.starter_messages &&
        currentPersona.starter_messages.length > 0 && (
          <>
            {currentPersona.starter_messages
              .slice(0, 4)
              .map((starterMessage, i) => (
                <div key={i} className="w-1/4">
                  <button
                    onClick={() => onSubmit(starterMessage.message)}
                    className={`relative flex w-40 flex-col gap-2 rounded-2xl shadow-sm border border-border px-3 py-2 text-start align-top text-[15px] shadow-xxs transition enabled:hover:bg-background-100 disabled:cursor-not-allowed line-clamp-3`}
                    style={{ height: `5.4rem` }}
                  >
                    {starterMessage.name}
                  </button>
                </div>
              ))}
          </>
        )}
    </div>
  );
}

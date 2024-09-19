import { Persona } from "@/app/admin/assistants/interfaces";
import { User } from "../types";
import { checkUserIsNoAuthUser } from "../user";

export function checkUserOwnsAssistant(user: User | null, assistant: Persona) {
  return checkUserIdOwnsAssistant(user?.id, assistant);
}

export function checkUserIdOwnsAssistant(
  userId: string | undefined,
  assistant: Persona
) {
  return (
    (!userId ||
      checkUserIsNoAuthUser(userId) ||
      assistant.owner?.id === userId) &&
    !assistant.is_default_persona
  );
}

export function getShownAssistants(user: User | null, assistants: Persona[]) {
  if (!user) {
    return assistants.filter((assistant) => assistant.is_default_persona);
  }

  return assistants.filter((assistant) => {
    const isVisible = user.preferences?.visible_assistants?.includes(
      assistant.id
    );
    const isNotHidden = !user.preferences?.hidden_assistants?.includes(
      assistant.id
    );
    const isSelected =
      user.preferences?.chosen_assistants?.includes(assistant.id) ||
      user.preferences?.chosen_assistants?.includes(assistant.id);
    const isDefault = assistant.is_default_persona;
    console.log(
      "assistant: ",
      assistant.name,
      " \nvisible: ",
      isVisible,
      " \nisNotHidden: ",
      isNotHidden,
      " \nisSelected: ",
      isSelected,
      " \nisDefault: ",
      isDefault
    );
    return (isVisible && isNotHidden && isSelected) || isDefault;
  });
}

import { BooleanFormField } from "./Field";

export default function IsPublicField({
  name = "is_public",
}: {
  name?: string;
}) {
  return (
    <BooleanFormField
      name={name}
      label="Sind die Dokumente öffentlich?"
      subtext={
        "Wenn aktiviert, sind die von diesem Connector indizierten Dokumente für alle Benutzer sichtbar. Wenn deaktiviert, haben nur Benutzer Zugriff auf die Dokumente, denen explizit Zugriff gewährt wurde (z. B. über eine Benutzergruppe)."
      }
    />
  );
}

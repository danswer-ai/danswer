//

import { EmbeddingProvider } from "@/components/embedding/interfaces";

// @router.delete("/delete-search-settings")
// def delete_search_settings_endpoint(
//     provider_type: EmbeddingProvider | None,
//     model_name: str,
//     _: User | None = Depends(current_admin_user),
//     db_session: Session = Depends(get_session),
// ) -> None:
//     try:
//         delete_search_settings(
//             db_session=db_session,
//             provider_type=provider_type,
//             model_name=model_name
//         )
//     except ValueError as e:
//         raise HTTPException(status_code=400, detail=str(e))

export const deleteSearchSettings = async (
  provider_type: EmbeddingProvider | null,
  model_name: string
) => {
  const res = await fetch(`/api/search-settings/delete-search-settings`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider_type, model_name }),
  });

  if (!res.ok) {
    throw new Error("Failed to delete search settings");
  }
  return res;
};

export const adminSearch = async (query: string) => {
  const response = await fetch("/api/admin/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
    }),
  });
  return response;
};

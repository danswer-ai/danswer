const userMutationFetcher = async (
  url: string,
  { arg }: { arg: { user_email: string; new_role?: string; method?: string } }
) => {
  const { method = "PATCH", ...body } = arg;
  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (res.ok) return res.json();

    const errorDetail = (await res.json()).detail;
    throw Error(errorDetail);
  });
};

export default userMutationFetcher;
/* const userMutationFetcher = async (
  url: string,
  {
    arg,
  }: { arg: { user_email: string; new_role: string; teamspace_id: string } }
) => {
  return fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_email: arg.user_email,
      new_role: arg.new_role,
    }),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const errorDetail = (await res.json()).detail;
    throw Error(errorDetail);
  });
};

export default userMutationFetcher; */

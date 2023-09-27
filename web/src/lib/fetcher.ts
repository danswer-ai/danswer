export const fetcher = (url: string) => fetch(url).then((res) => res.json());

class FetchError extends Error {
  status: number;
  info: any;

  constructor(message: string, status: number, info: any) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

export const errorHandlingFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new FetchError(
      "An error occurred while fetching the data.",
      res.status,
      await res.json()
    );
    throw error;
  }
  return res.json();
};

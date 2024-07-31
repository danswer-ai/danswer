import useSWR from "swr";
import { InputPrompt } from "./interfaces";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useInputPrompts = () => {
  const { data, error, mutate } = useSWR<InputPrompt[]>(
    "/api/input_prompt",
    fetcher
  );

  return {
    data,
    error,
    isLoading: !error && !data,
    refreshInputPrompts: mutate,
  };
};

export const useInputPrompt = (id: number) => {
  const { data, error, mutate } = useSWR<InputPrompt>(
    `/api/input_prompt/${id}`,
    fetcher
  );

  return {
    data,
    error,
    isLoading: !error && !data,
    refreshInputPrompt: mutate,
  };
};

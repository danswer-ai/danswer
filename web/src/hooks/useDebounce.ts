import { useEffect, useState } from "react";

export const useDebounce = <T>(
  value: T,
  delay: number
): [T, (value: T) => void] => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debouncedValue, setDebouncedValue] as const;
};

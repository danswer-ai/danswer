import { useEffect, useState } from "react";

/**
 * Debouncing delays the execution of a function until a certain amount of time has passed.
 * For example, you can use debouncing when a user is typing in a search box.
 * Instead of searching every time the user types, you wait until they stop typing for a short time.
 * This can prevent repeated API calls and improve performance.
 */
export const useDebounce = <T>(
  value: T, // The value to debounce
  delay: number // The delay in milliseconds
): [T, (value: T) => void] => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Timer that sets the debounced value after the delay
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    // Cleanup function to clear the timer when the component unmounts or the value changes
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [debouncedValue, setDebouncedValue] as const;
};

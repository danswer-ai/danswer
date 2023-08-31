const IS_AI_THOUGHTS_OPEN_LOCAL_STORAGE_KEY = "isAIThoughtsOpen";

export const getAIThoughtsIsOpenSavedValue = () => {
  // wrapping in `try / catch` to avoid SSR errors during development
  try {
    return (
      localStorage.getItem(IS_AI_THOUGHTS_OPEN_LOCAL_STORAGE_KEY) === "true"
    );
  } catch (e) {
    return false;
  }
};

export const setAIThoughtsIsOpenSavedValue = (isOpen: boolean) => {
  localStorage.setItem(IS_AI_THOUGHTS_OPEN_LOCAL_STORAGE_KEY, String(isOpen));
};

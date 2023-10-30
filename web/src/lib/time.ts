const conditionallyAddPlural = (noun: string, cnt: number) => {
  if (cnt > 1) {
    return `${noun}s`;
  }
  return noun;
};

export const timeAgo = (
  dateString: string | undefined | null
): string | null => {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  const now = new Date();
  const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsDiff < 60) {
    return `${secondsDiff} ${conditionallyAddPlural(
      "second",
      secondsDiff
    )} ago`;
  }

  const minutesDiff = Math.floor(secondsDiff / 60);
  if (minutesDiff < 60) {
    return `${minutesDiff} ${conditionallyAddPlural(
      "minute",
      secondsDiff
    )} ago`;
  }

  const hoursDiff = Math.floor(minutesDiff / 60);
  if (hoursDiff < 24) {
    return `${hoursDiff} ${conditionallyAddPlural("hour", hoursDiff)} ago`;
  }

  const daysDiff = Math.floor(hoursDiff / 24);
  if (daysDiff < 30) {
    return `${daysDiff} ${conditionallyAddPlural("day", daysDiff)} ago`;
  }

  const weeksDiff = Math.floor(daysDiff / 7);
  if (weeksDiff < 4) {
    return `${weeksDiff} ${conditionallyAddPlural("week", weeksDiff)} ago`;
  }

  const monthsDiff = Math.floor(daysDiff / 30);
  if (monthsDiff < 12) {
    return `${monthsDiff} ${conditionallyAddPlural("month", monthsDiff)} ago`;
  }

  const yearsDiff = Math.floor(monthsDiff / 12);
  return `${yearsDiff} ${conditionallyAddPlural("year", yearsDiff)} ago`;
};

export function localizeAndPrettify(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export const timeAgo = (dateString: string | undefined): string | null => {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  const now = new Date();
  const secondsDiff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsDiff < 60) {
    return `${secondsDiff} seconds ago`;
  }

  const minutesDiff = Math.floor(secondsDiff / 60);
  if (minutesDiff < 60) {
    return `${minutesDiff} minutes ago`;
  }

  const hoursDiff = Math.floor(minutesDiff / 60);
  if (hoursDiff < 24) {
    return `${hoursDiff} hours ago`;
  }

  const daysDiff = Math.floor(hoursDiff / 24);
  if (daysDiff < 30) {
    return `${daysDiff} days ago`;
  }

  const monthsDiff = Math.floor(daysDiff / 30);
  if (monthsDiff < 12) {
    return `${monthsDiff} months ago`;
  }

  const yearsDiff = Math.floor(monthsDiff / 12);
  return `${yearsDiff} years ago`;
};

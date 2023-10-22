export function getXDaysAgo(daysAgo: number) {
  const today = new Date();
  const daysAgoDate = new Date(today);
  daysAgoDate.setDate(today.getDate() - daysAgo);
  return daysAgoDate;
}

export const timestampToDateString = (timestamp: string) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const day = date.getDate();

  const formattedDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  return formattedDate;
};

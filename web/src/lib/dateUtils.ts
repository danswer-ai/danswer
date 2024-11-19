import { DateRangePickerValue } from "@/app/ee/admin/performance/DateRangeSelector";

export function getXDaysAgo(daysAgo: number) {
  const today = new Date();
  const daysAgoDate = new Date(today);
  daysAgoDate.setDate(today.getDate() - daysAgo);
  return daysAgoDate;
}

export function getXYearsAgo(yearsAgo: number) {
  const today = new Date();
  const yearsAgoDate = new Date(today);
  yearsAgoDate.setFullYear(yearsAgoDate.getFullYear() - yearsAgo);
  return yearsAgoDate;
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

// Options for formatting the date
const dateOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

// Options for formatting the time
const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true, // Use 12-hour format with AM/PM
};

export const timestampToReadableDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return (
    date.toLocaleDateString(undefined, dateOptions) +
    ", " +
    date.toLocaleTimeString(undefined, timeOptions)
  );
};

export const buildDateString = (date: Date | null) => {
  return date
    ? `${Math.round(
        (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      )} days ago`
    : "Select a time range";
};
export const getTimeAgoString = (date: Date | null) => {
  if (!date) return null;

  const diffMs = new Date().getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (buildDateString(date).includes("Today")) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
};

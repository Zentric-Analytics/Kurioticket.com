export const toIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const addDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return toIsoDate(date); };
export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
export const todayIso = () => toIsoDate(new Date());
export const isAfterDateTime = (date: string, time: string, earlierDate: string, earlierTime: string) => new Date(`${date}T${time}:00`).getTime() > new Date(`${earlierDate}T${earlierTime}:00`).getTime();
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

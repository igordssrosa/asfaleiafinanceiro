export function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(value);
}

export function formatDate(
  value: string,
): string {
  const [year, month, day] =
    value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

export function getCurrentMonth(): string {
  const currentDate = new Date();

  const year =
    currentDate.getFullYear();

  const month = String(
    currentDate.getMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}`;
}

export function getCurrentDate(): string {
  const currentDate = new Date();

  const year =
    currentDate.getFullYear();

  const month = String(
    currentDate.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    currentDate.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
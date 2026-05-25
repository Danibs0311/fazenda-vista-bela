
/**
 * Logic: Weeks run from FRIDAY (start) to THURSDAY (end).
 * Payments for a week are made on the FRIDAY immediately after it ends.
 */

export const getWeekRange = (dateStr?: string, weekOffset: number = 0) => {
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  date.setDate(date.getDate() + (weekOffset * 7));

  // Day of week: 0 (Sun), 1 (Mon) ... 5 (Fri), 6 (Sat)
  const day = date.getDay();

  // Logic: Week starts on Friday (5).
  let daysSinceFriday = (day + 2) % 7;

  const startDate = new Date(date);
  startDate.setDate(date.getDate() - daysSinceFriday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Ends on Thursday

  const toLocalDateString = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    start: toLocalDateString(startDate),
    end: toLocalDateString(endDate),
    id: toLocalDateString(startDate)
  };
};

export const getPaymentDate = (weekEndDate: string) => {
  // Payment is on Friday, the day after the week ends (Thursday)
  const end = new Date(weekEndDate + 'T12:00:00');
  const paymentDate = new Date(end);
  paymentDate.setDate(end.getDate() + 1);
  return paymentDate.toISOString().split('T')[0];
};

export const formatDate = (dateStr: string) => {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

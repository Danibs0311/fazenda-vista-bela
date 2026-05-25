const getWeekRangeJS = (dateStr, weekOffset = 0) => {
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date("2026-05-24T22:23:04-03:00");
  date.setDate(date.getDate() + (weekOffset * 7));

  const day = date.getDay();
  let daysSinceFriday = (day + 2) % 7;

  const startDate = new Date(date);
  startDate.setDate(date.getDate() - daysSinceFriday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6); // Ends on Thursday

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    id: startDate.toISOString().split('T')[0]
  };
};

console.log("getWeekRange for today:", getWeekRangeJS());

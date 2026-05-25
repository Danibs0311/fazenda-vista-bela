const date = new Date("2026-05-24T22:23:04-03:00");
console.log("date.toString():", date.toString());
console.log("date.toUTCString():", date.toUTCString());
console.log("date.getDay() (local):", date.getDay());
console.log("date.getUTCDay() (UTC):", date.getUTCDay());
console.log("date.getDate() (local):", date.getDate());
console.log("date.getUTCDate() (UTC):", date.getUTCDate());

const day = date.getDay();
let daysSinceFriday = (day + 2) % 7;
console.log("daysSinceFriday:", daysSinceFriday);

const startDate = new Date(date);
startDate.setDate(date.getDate() - daysSinceFriday);
console.log("startDate.toString():", startDate.toString());
console.log("startDate.toISOString():", startDate.toISOString());

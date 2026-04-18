// Patients_WebPages/dashboardLogic.js

function filterUpcomingAppointments(appointments) {
  const today = new Date();
  return appointments
    .filter(a => new Date(a.date) <= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calcQueueProgress(position, total) {
  if (total === 0) return 0;
  return Math.round(((total - position) / total) * 100);
}

function calcWaitTime(position, estimateWait) {
  if (estimateWait && estimateWait !== 0) return estimateWait;
  return (position - 1) * 8;
}

function getQueueMessage(position, percent) {
  if (position === 1) return "You're next! Please get ready.";
  if (percent >= 70) return "Almost there — you're very close.";
  if (percent >= 40) return "You are moving steadily through the queue.";
  return "You're in the queue. We'll keep you updated.";
}

module.exports = {
  filterUpcomingAppointments,
  calcQueueProgress,
  calcWaitTime,
  getQueueMessage
};
// Patients_WebPages/dashboardLogic.js

// Function to filter and sort appointments
function filterUpcomingAppointments(appointments) {
  // Get today's current date
  const today = new Date();

  // Return filtered and sorted appointments
  return appointments
    // Keep appointments based on date condition
    .filter(a => new Date(a.date) <= today)
    // Sort appointments from earliest to latest
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Function to calculate queue progress as a percentage
function calcQueueProgress(position, total) {
  // If no one is in the queue, return 0 to avoid division error
  if (total === 0) return 0;

  // Calculate percentage progress based on position
  return Math.round(((total - position) / total) * 100);
}

// Function to calculate estimated waiting time
function calcWaitTime(position, estimateWait) {
  // Use provided estimate if available
  if (estimateWait && estimateWait !== 0) return estimateWait;

  // Otherwise estimate wait time (8 minutes per person ahead)
  return (position - 1) * 8;
}

// Function to generate a user-friendly queue message
function getQueueMessage(position, percent) {
  // If user is first in queue
  if (position === 1) return "You're next! Please get ready.";

  // If user is close to the front
  if (percent >= 70) return "Almost there — you're very close.";

  // If user is halfway through the queue
  if (percent >= 40) return "You are moving steadily through the queue.";

  // Default message for early queue positions
  return "You're in the queue. We'll keep you updated.";
}

// Export functions so they can be used in other files
module.exports = {
  filterUpcomingAppointments,
  calcQueueProgress,
  calcWaitTime,
  getQueueMessage
};
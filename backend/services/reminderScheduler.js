import cron from 'node-cron';
import Reminder from '../model/reminder.model.js';
import { sendReminderNotifications } from '../controller/reminder.controller.js';

let schedulerRunning = false;

// ==================== REMINDER SCHEDULER ====================
// Runs every minute to check for pending reminders
export const startReminderScheduler = () => {
  if (schedulerRunning) {
    console.log('⚠️  Reminder scheduler is already running');
    return;
  }

  console.log('🔔 Starting reminder scheduler...');

  // Schedule to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processReminders();
    } catch (error) {
      console.error('❌ Reminder scheduler error:', error);
    }
  });

  schedulerRunning = true;
  console.log('✅ Reminder scheduler started successfully');
};

// ==================== PROCESS REMINDERS ====================
async function processReminders() {
  try {
    // Get all pending reminders that need to be sent
    const reminders = await Reminder.getPending();

    if (reminders.length === 0) {
      return; // No reminders to process
    }

    console.log(`📬 Processing ${reminders.length} reminder(s)...`);

    // Process each reminder
    for (const reminder of reminders) {
      try {
        await sendReminderNotifications(reminder);
        console.log(`✅ Reminder sent: ${reminder.title}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder ${reminder._id}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Error processing reminders:', error);
  }
}

// ==================== STOP SCHEDULER ====================
export const stopReminderScheduler = () => {
  if (!schedulerRunning) {
    console.log('⚠️  Reminder scheduler is not running');
    return;
  }

  schedulerRunning = false;
  console.log('🛑 Reminder scheduler stopped');
};

// ==================== GET SCHEDULER STATUS ====================
export const getSchedulerStatus = () => {
  return {
    running: schedulerRunning,
    message: schedulerRunning ? 'Scheduler is running' : 'Scheduler is stopped'
  };
};

export default {
  startReminderScheduler,
  stopReminderScheduler,
  getSchedulerStatus
};

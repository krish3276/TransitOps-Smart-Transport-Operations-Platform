import cron from 'node-cron';
import Driver from '../models/Driver.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/emailService.js';

export const checkExpiringLicenses = async () => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Find drivers whose license expires within the next 7 days
    const expiringDrivers = await Driver.find({
      licenseExpiry: { $lte: nextWeek }
    });

    if (expiringDrivers.length === 0) {
      console.log('No expiring licenses found.');
      return { count: 0 };
    }

    // Get recipients: Fleet Managers and Safety Officers
    const admins = await User.find({
      role: { $in: ['Fleet Manager', 'Safety Officer'] }
    });
    
    // Aggregate emails (Admins + affected Drivers if they have an email)
    const emails = new Set();
    admins.forEach(admin => {
      if (admin.email) emails.add(admin.email);
    });
    expiringDrivers.forEach(driver => {
      if (driver.email) emails.add(driver.email);
    });

    if (emails.size === 0) {
      console.log('No valid email recipients found to send alerts.');
      return { count: expiringDrivers.length };
    }

    const to = Array.from(emails).join(', ');

    // Build Email HTML
    let html = `<h2>Expiring License Alert</h2>
                <p>The following drivers have licenses that are expiring within 7 days or have already expired:</p>
                <ul>`;
    
    expiringDrivers.forEach(d => {
      const isExpired = new Date(d.licenseExpiry) < today;
      html += `<li><strong>${d.name}</strong> (License: ${d.licenseNumber}) - Expiry: ${d.licenseExpiry.toISOString().split('T')[0]} ${isExpired ? '<strong>(EXPIRED)</strong>' : ''}</li>`;
    });
    html += `</ul><p>Please take action immediately to prevent dispatch interruptions.</p>`;

    await sendEmail({
      to,
      subject: `Action Required: ${expiringDrivers.length} Driver Licenses Expiring Soon`,
      html
    });

    return { count: expiringDrivers.length };
  } catch (error) {
    console.error('Error checking expiring licenses:', error);
    return { error: error.message };
  }
};

export const initCronJobs = () => {
  // Run every 24 hours at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    console.log('Running scheduled job: checkExpiringLicenses');
    checkExpiringLicenses();
  });
};

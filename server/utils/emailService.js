import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"TransitOps Admin" <admin@transitops.com>',
        to,
        subject,
        html,
      });
      console.log(`✉️ Email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  } else {
    // Fallback for demo
    console.log('\n================ EMAIL INTERCEPTED (Demo Mode) ================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Body:');
    console.log(html.replace(/<[^>]+>/g, ' ')); // Strip HTML for console readability
    console.log('===============================================================\n');
  }
};

import Mailgen from "mailgen";
import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  // 1. Initialize Mailgen for branding
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "www.github.com/theinfinitematrix",
    },
  });

  // 2. Generate Email Content (HTML and Plain Text)
  const emailHTML = mailGenerator.generate(options.mailgenContent);
  const emailText = mailGenerator.generatePlaintext(options.mailgenContent);

  // 3. Configure Transporter (SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASS,
    },
  });

  // 4. Send Email
  const mail = {
    from: "kumarnishant1904@gmail.com",
    to: options.email,
    subject: options.subject,
    html: emailHTML,
    text: emailText,
  };

  try {
    await transporter.sendMail(mail);
  } catch (err) {
    console.error("Email service failed silently: ", err);
  }
};

export const verifyMailMailgenContent = (username, verificationURL) => {
  return {
    body: {
      name: username,
      intro: "Welcome to Matrixxx! We're very excited to have you on board.",
      action: {
        instructions: "To get started with us, please click here:",
        button: {
          color: "#22BC66",
          text: "Confirm your account",
          link: verificationURL,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export const passwordResetMailgenContent = (username, resetURL) => {
  return {
    body: {
      name: username,
      intro:
        "You have received this email because a password reset request for your account was received.",
      action: {
        instructions: "Click the button below to reset your password:",
        button: {
          color: "#DC4D2F",
          text: "Reset your password",
          link: resetURL,
        },
      },
      outro:
        "If you did not request a password reset, no further action is required on your part.",
    },
  };
};

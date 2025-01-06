import nodeMailer from "nodemailer";

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_PASSWORD;

const mailTransporter = nodeMailer.createTransport({
  secure: true,
  host: "smtp.gmail.com",
  port: 465,
  auth: {
    user: gmailUser,
    pass: gmailPassword
  }
});

export default mailTransporter;

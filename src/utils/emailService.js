import nodemailer from 'nodemailer';
import logger from './logger.js';

// Email templates (moved to top so they're available immediately)
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to TradePro - Your Journey Begins!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00bcd4;">Welcome to TradePro, ${name}!</h2>
        <p>Thank you for joining TradePro. We're excited to have you on board.</p>
        <p>With TradePro, you can:</p>
        <ul>
          <li>Trade cryptocurrencies with advanced tools</li>
          <li>Invest in various plans for steady returns</li>
          <li>Track real-time market data</li>
          <li>Secure your assets with our advanced security</li>
        </ul>
        <p>Get started by exploring your dashboard and making your first deposit.</p>
        <p>If you have any questions, our support team is here to help.</p>
        <br>
        <p>Happy Trading!</p>
        <p>The TradePro Team</p>
      </div>
    `
  }),
  
  passwordReset: (name, resetLink) => ({
    subject: 'TradePro - Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00bcd4;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p>
          <a href="${resetLink}" style="background-color: #00bcd4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email or contact support.</p>
        <br>
        <p>The TradePro Team</p>
      </div>
    `
  }),
  
  depositConfirmation: (name, amount, currency) => ({
    subject: `TradePro - Deposit Confirmation (${amount} ${currency})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00bcd4;">Deposit Confirmed</h2>
        <p>Hello ${name},</p>
        <p>Your deposit of <strong>${amount} ${currency}</strong> has been successfully processed.</p>
        <p>The funds are now available in your TradePro wallet.</p>
        <p>You can start trading or investing immediately.</p>
        <br>
        <p>Thank you for choosing TradePro!</p>
        <p>The TradePro Team</p>
      </div>
    `
  }),
  
  withdrawalConfirmation: (name, amount, currency, address) => ({
    subject: `TradePro - Withdrawal Initiated (${amount} ${currency})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00bcd4;">Withdrawal Initiated</h2>
        <p>Hello ${name},</p>
        <p>Your withdrawal of <strong>${amount} ${currency}</strong> has been initiated.</p>
        <p><strong>Destination:</strong> ${address}</p>
        <p>This transaction will be processed shortly. You'll receive another email when it's completed.</p>
        <p>If you didn't initiate this withdrawal, please contact our support team immediately.</p>
        <br>
        <p>The TradePro Team</p>
      </div>
    `
  }),
  
  investmentCreated: (name, plan, amount, duration) => ({
    subject: `TradePro - Investment Created (${plan} Plan)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00bcd4;">Investment Created Successfully</h2>
        <p>Hello ${name},</p>
        <p>Your investment in the <strong>${plan} Plan</strong> has been successfully created.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>Amount: ${amount} USD</li>
          <li>Duration: ${duration} days</li>
          <li>Plan: ${plan}</li>
        </ul>
        <p>You can track your investment performance from your dashboard.</p>
        <br>
        <p>Happy Investing!</p>
        <p>The TradePro Team</p>
      </div>
    `
  }),
  
  securityAlert: (name, activity, location) => ({
    subject: 'TradePro - Security Alert',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4444;">Security Alert</h2>
        <p>Hello ${name},</p>
        <p>We detected unusual activity on your account:</p>
        <ul>
          <li><strong>Activity:</strong> ${activity}</li>
          <li><strong>Location:</strong> ${location}</li>
          <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>If this was you, no action is required.</p>
        <p>If you didn't perform this activity, please:</p>
        <ol>
          <li>Change your password immediately</li>
          <li>Enable two-factor authentication</li>
          <li>Contact our support team</li>
        </ol>
        <br>
        <p>The TradePro Security Team</p>
      </div>
    `
  })
};

// ✅ FIXED: No top-level transporter creation
let transporter = null;

const createTransporter = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = parseInt(process.env.EMAIL_PORT);
  
  // Development: Use MailDev or mock
  if (!isProduction) {
    // Check if MailDev is specified in env or use ethereal
    if (emailHost === 'localhost' || emailHost === '127.0.0.1') {
      logger.info('Using MailDev for email (development)');
      return nodemailer.createTransport({
        host: 'localhost',
        port: 1025, // MailDev default port
        secure: false,
        ignoreTLS: true
      });
    }
    
    // If no email config, use a mock/development mode
    if (!emailHost) {
      logger.info('Email not configured - using development mode');
      return {
        sendMail: async (mailOptions) => {
          logger.info('[DEV] Mock email sent:', {
            to: mailOptions.to,
            subject: mailOptions.subject
          });
          return {
            messageId: `dev-${Date.now()}`,
            response: 'Development mode - email not actually sent'
          };
        },
        verify: (callback) => callback(null, true)
      };
    }
  }
  
  // Production or development with real email service
  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort || 587,
    secure: emailPort === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    maxConnections: 5,
    maxMessages: 100
  });
};

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
    
    // ✅ MOVED: Verify connection only when transporter is first created
    if (transporter.verify) {
      transporter.verify((error) => {
        if (error) {
          if (process.env.NODE_ENV === 'production') {
            logger.error('Email transporter error:', error.message);
          } else {
            logger.warn('Email not configured for development:', error.message);
          }
        } else {
          logger.info('Email server is ready to send messages');
        }
      });
    }
  }
  return transporter;
};

// Send email function
export const sendEmail = async (to, templateName, templateData) => {
  try {
    const template = emailTemplates[templateName];
    
    if (!template) {
      throw new Error(`Email template "${templateName}" not found`);
    }
    
    const { subject, html, text } = typeof template === 'function' 
      ? template(...templateData)
      : template;
    
    const mailOptions = {
      from: `"TradePro" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@tradepro.com'}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    };
    
    const currentTransporter = getTransporter(); // ✅ Lazy initialization
    
    // If transporter is mock (development without email config)
    if (typeof currentTransporter.sendMail !== 'function') {
      logger.info('[DEV] Would send email:', {
        to,
        template: templateName,
        subject
      });
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
        devMode: true
      };
    }
    
    const info = await currentTransporter.sendMail(mailOptions);
    
    logger.info(`Email sent: ${templateName} to ${to}`, {
      messageId: info.messageId,
      template: templateName
    });
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    // Don't crash the app if email fails
    logger.error('Email sending error (non-critical):', {
      to,
      template: templateName,
      error: error.message
    });
    
    // In development, return success anyway
    if (process.env.NODE_ENV !== 'production') {
      return {
        success: true,
        messageId: `error-${Date.now()}`,
        error: error.message,
        devMode: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Convenience functions
export const sendWelcomeEmail = (email, name) => {
  return sendEmail(email, 'welcome', [name]);
};

export const sendPasswordResetEmail = (email, name, resetToken) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  return sendEmail(email, 'passwordReset', [name, resetLink]);
};

export const sendDepositConfirmationEmail = (email, name, amount, currency) => {
  return sendEmail(email, 'depositConfirmation', [name, amount, currency]);
};

export const sendWithdrawalConfirmationEmail = (email, name, amount, currency, address) => {
  return sendEmail(email, 'withdrawalConfirmation', [name, amount, currency, address]);
};

export const sendInvestmentCreatedEmail = (email, name, plan, amount, duration) => {
  return sendEmail(email, 'investmentCreated', [name, plan, amount, duration]);
};

export const sendSecurityAlertEmail = (email, name, activity, location) => {
  return sendEmail(email, 'securityAlert', [name, activity, location]);
};
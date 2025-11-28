import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter;

  constructor() {
    this.logger.log('Initializing EmailService with Gmail...');
    
this.transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
});

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log(' Email connection verified successfully');
    } catch (error) {
      this.logger.error(' Email connection failed:', error);
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    try {
      this.logger.log(`Sending verification code to: ${email}`);

      const mailOptions = {
        from: `"IdeaFlow" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Подтверждение регистрации в IdeaFlow',
        html: this.getVerificationEmailTemplate(code),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(` Verification email sent to ${email}, Message ID: ${info.messageId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      return false;
    }
  }
async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    try {
      this.logger.log(`Sending password reset email to: ${email}`);

      const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"IdeaFlow" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Восстановление пароля в IdeaFlow',
        html: this.getPasswordResetEmailTemplate(resetToken, resetLink),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  private getVerificationEmailTemplate(code: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">IdeaFlow</h1>
          <p style="margin: 10px 0 0 0;">Платформа для краудсорсинга идей</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Подтверждение регистрации</h2>
          <p>Благодарим за регистрацию в IdeaFlow! Для завершения процесса подтвердите ваш email адрес.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #667eea; text-align: center; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #666;">Ваш код подтверждения:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">
              ${code}
            </div>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Этот код действителен в течение 1 часа. Если вы не регистрировались в IdeaFlow, просто проигнорируйте это письмо.
          </p>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>С уважением,<br>Команда IdeaFlow</p>
        </div>
      </div>
    `;
  }
   private getPasswordResetEmailTemplate(token: string, resetLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">IdeaFlow</h1>
          <p style="margin: 10px 0 0 0;">Восстановление пароля</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Восстановление доступа</h2>
          <p>Мы получили запрос на восстановление пароля для вашего аккаунта в IdeaFlow.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #667eea; text-align: center; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #666;">Ваш токен для восстановления:</p>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #667eea; margin-bottom: 20px;">
              ${token}
            </div>
            <a href="${resetLink}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Восстановить пароль
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Или скопируйте этот токен в форму восстановления пароля:<br>
            <strong>${token}</strong>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            Этот токен действителен в течение 1 часа. Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
          </p>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>С уважением,<br>Команда IdeaFlow</p>
        </div>
      </div>
    `;
  }

}


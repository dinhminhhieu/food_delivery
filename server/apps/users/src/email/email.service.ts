import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

interface EmailOptions {
  subject: string;
  email: string;
  userName: string;
  activationCode: string;
  template: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(options: EmailOptions) {
    await this.mailerService.sendMail({
      to: options.email,
      subject: options.subject,
      template: options.template,
      context: {
        userName: options.userName,
        activationCode: options.activationCode,
      },
    });
  }
}

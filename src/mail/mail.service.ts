import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolve } from "path";
import * as nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import * as pug from "pug";
import juice from "juice";
import { convert } from "html-to-text";

export interface MailSendOptions {
  to: string;
  subject: string;
  template: "welcome" | "password-reset";
  context?: Record<string, unknown>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>("MAIL_FROM") ?? "Loomernescent <talk@tbullock.net>";
    this.appUrl = this.config.get<string>("APP_URL") ?? "http://localhost:3000";

    const smtpUser = this.config.get<string>("MAILGUN_SMTP_LOGIN");
    const smtpPass = this.config.get<string>("MAILGUN_SMTP_PASSWORD");

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>("MAILGUN_SMTP_HOST") ?? "smtp.mailgun.org",
      port: Number(this.config.get<string>("MAILGUN_SMTP_PORT") ?? 587),
      ...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
    });
  }

  private renderHtml(
    template: MailSendOptions["template"],
    context: Record<string, unknown>,
  ): string {
    const templatePath = resolve(process.cwd(), "views", "email", `${template}.pug`);
    const html = pug.renderFile(templatePath, {
      ...context,
      appUrl: this.appUrl,
    });
    return juice(html);
  }

  async send(options: MailSendOptions): Promise<void> {
    const html = this.renderHtml(options.template, options.context ?? {});
    const text = convert(html, { wordwrap: 130 });

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html,
        text,
      });
      this.logger.log(
        `Mail sent: template=${options.template} to=${options.to} messageId=${info.messageId}`,
      );
    } catch (err) {
      this.logger.error(
        `Mail send failed: template=${options.template} to=${options.to}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}

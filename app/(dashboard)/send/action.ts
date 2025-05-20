'use server'

import { Resend } from 'resend';
import { marked } from 'marked';
import { getDB, Env } from '@/app/lib/d1';
import sha256 from 'crypto-js/sha256';

// 连接 Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(
  from: string, // User's email
  to: string,   // Recipient's email
  subject: string,
  content: string, // Markdown content
  password: string, // User's password for authentication
  username: string // User's username for the 'from' field in email
): Promise<boolean | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码
    const authSql = `SELECT role FROM user WHERE email = ?1 AND password = ?2;`;
    const authUser = await db.prepare(authSql)
      .bind(from, hashedPassword)
      .first<{ role: string }>();

    if (!authUser) {
      return '401'; // Unauthorized
    }
    if (authUser.role !== 'admin' && authUser.role !== 'user') {
      return '403'; // Forbidden
    }

    // 渲染 Markdown
    const mailBodyMarkdown = await marked.parse(content);
    // Fetch CSS - consider caching this in a real app or making it part of the build
    const css = await (await fetch('https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.css')).text();
    
    const fullHtmlForEmail = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            ${css}
            /* Additional styles for email */
            .markdown-body {
              box-sizing: border-box;
              min-width: 200px;
              max-width: 900px;
              margin: 0 auto;
              padding: 45px;
            }
            @media (prefers-color-scheme: dark) {
              .markdown-body {
                background-color: #0d1117; /* GitHub dark background */
                color: #c9d1d9; /* GitHub dark text */
              }
            }
          </style>
        </head>
        <body>
          <div class='markdown-body'>
            ${mailBodyMarkdown}
          </div>
        </body>
      </html>
    `;

    // 发送邮件
    const { error: resendError } = await resend.emails.send({
      from: `${username} <${from}>`, // Display name <email@example.com>
      to: [to],
      subject,
      html: fullHtmlForEmail,
      text: content, // Original markdown content as text part
    });

    if (resendError) {
      console.error("Resend API Error:", resendError);
      return '500a'; // Error sending email via Resend
    }

    // 保存邮件到 D1
    const emailTimestamp = Math.floor(Date.now() / 1000);
    const insertSql = `
      INSERT INTO sent (fromAddress, toAddress, subject, text, html, date, attachments)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);
    `;
    
    try {
      await db.prepare(insertSql)
        .bind(
          from,
          to,
          subject,
          content, // Original markdown content
          fullHtmlForEmail, // Full HTML sent
          emailTimestamp,
          '[]'     // attachments - empty JSON array as string
        )
        .run();
    } catch (d1Error) {
      console.error("D1 Insert Error (sent table):", d1Error);
      // If Resend succeeded but D1 failed, the email was sent but not saved.
      // This might warrant a more specific error code or logging.
      return '500b'; // Error saving sent email to D1
    }

    return true;
  } catch (err) {
    console.error("sendEmail general error:", err);
    // This will catch errors from DB connection, password hashing, or other unexpected issues.
    throw new Error(err instanceof Error ? err.message : '未知发送错误');
  }
}

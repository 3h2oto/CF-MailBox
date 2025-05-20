'use server'

import { getDB, Env } from '@/app/lib/d1';
import sha256 from 'crypto-js/sha256';

export type Mail = {
  _id: string
  from: string // fromAddress in D1
  fromName: string
  subject: string
  content: string // html in D1
  date: string // Unix timestamp (number) in D1, converted to ISO string
  attachments?: string[] // JSON string in D1, parsed to array
}

// 删除特定邮件
export async function deleteEmail(email: string, password: string, _id: string): Promise<boolean | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码
    const authUser = await db.prepare("SELECT role FROM user WHERE email = ?1 AND password = ?2")
      .bind(email, hashedPassword)
      .first<{ role: string }>();

    if (!authUser) {
      return '401';
    } else if (authUser.role !== 'admin' && authUser.role !== 'user') {
      return '403';
    }

    // 删除邮箱
    const emailId = parseInt(_id, 10);
    if (isNaN(emailId)) {
        return '400'; // Invalid _id format
    }
    const res = await db.prepare("DELETE FROM inbox WHERE id = ?1")
      .bind(emailId)
      .run();

    if (res.meta.changes === 0) {
      return '404'; // Not found or not deleted
    }
    return true;
  } catch (err) {
    console.error("deleteEmail error:", err);
    throw new Error(err instanceof Error ? err.message : '未知错误');
  }
}

// 返回特定邮件
export async function getEmail(email: string, password: string, _id: string): Promise<Mail | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码
    const authUser = await db.prepare("SELECT id FROM user WHERE email = ?1 AND password = ?2")
      .bind(email, hashedPassword)
      .first();

    if (!authUser) {
      return '401';
    }

    // 获取邮箱
    const emailId = parseInt(_id, 10);
    if (isNaN(emailId)) {
        return '400'; // Invalid _id format
    }
    
    const emailData = await db.prepare(
      "SELECT id, fromAddress, fromName, subject, html, date, attachments FROM inbox WHERE id = ?1"
    ).bind(emailId).first<{ id: number; fromAddress: string | null; fromName: string | null; subject: string | null; html: string | null; date: number | null; attachments: string | null }>();

    if (!emailData) {
      return '404';
    }

    return {
      _id: emailData.id.toString(),
      fromName: emailData.fromName || '', // Handle null from D1
      from: emailData.fromAddress || '', // Handle null from D1
      subject: emailData.subject || '', // Handle null from D1
      content: emailData.html || '', // Handle null from D1, content is html
      date: emailData.date ? new Date(emailData.date * 1000).toISOString() : new Date(0).toISOString(), // Handle null date
      attachments: emailData.attachments ? JSON.parse(emailData.attachments) : []
    };
  } catch (err) {
    console.error("getEmail error:", err);
    throw new Error(err instanceof Error ? err.message : '未知错误');
  }
}

// 返回邮件列表, 内容仅需前 100 个字符
export async function getMails(email: string, password: string, limit: number, skip: number): Promise<Mail[] | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码
    const authUser = await db.prepare("SELECT id FROM user WHERE email = ?1 AND password = ?2")
      .bind(email, hashedPassword)
      .first();

    if (!authUser) {
      return '401';
    }

    // 获取邮箱列表
    const sql = `
      SELECT id, fromAddress, fromName, subject, text, date
      FROM inbox
      WHERE toAddress = ?1
      ORDER BY date DESC
      LIMIT ?2 OFFSET ?3;
    `;
    const { results } = await db.prepare(sql)
      .bind(email, limit, skip)
      .all<{ id: number; fromAddress: string | null; fromName: string | null; subject: string | null; text: string | null; date: number | null; }>();

    const mails: Mail[] = (results || []).map(doc => ({
      _id: doc.id.toString(),
      from: doc.fromAddress || '',
      fromName: doc.fromName || '',
      subject: doc.subject || '',
      content: doc.text ? doc.text.slice(0, 100) : '', // Use text for content preview
      date: doc.date ? new Date(doc.date * 1000).toISOString() : new Date(0).toISOString(),
      attachments: [] // Not fetched in this query
    }));
    
    return mails;
  } catch (err) {
    console.error("getMails error:", err);
    throw new Error(err instanceof Error ? err.message : '未知错误');
  }
}

// 判断是否有新邮件
export async function hasNewEmail(email: string, password: string, localDate: string): Promise<boolean | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码
    const authUser = await db.prepare("SELECT id FROM user WHERE email = ?1 AND password = ?2")
      .bind(email, hashedPassword)
      .first();

    if (!authUser) {
      return '401';
    }

    // 检查是否有新邮件
    let localTimestamp: number;
    try {
      const dateObj = new Date(localDate);
      localTimestamp = Math.floor(dateObj.getTime() / 1000);
      if (isNaN(localTimestamp)) {
        // Handle invalid date string, perhaps return an error or default to a very old date
        console.warn("hasNewEmail: Invalid localDate provided", localDate);
        // Depending on desired behavior, could throw, or use a default like 0
        return '400'; // Bad request due to invalid date format
      }
    } catch (e) {
      console.warn("hasNewEmail: Error parsing localDate", localDate, e);
      return '400'; // Bad request
    }
    
    const sql = `SELECT id FROM inbox WHERE toAddress = ?1 AND date > ?2 LIMIT 1;`;
    const result = await db.prepare(sql)
      .bind(email, localTimestamp)
      .first();
      
    return Boolean(result);
  } catch (err) {
    console.error("hasNewEmail error:", err);
    throw new Error(err instanceof Error ? err.message : '未知错误');
  }
}
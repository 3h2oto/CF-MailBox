'use server'

import { getDB, Env } from '@/app/lib/d1';
import sha256 from 'crypto-js/sha256';

export type Mail = {
  _id: string;
  to: string; // toAddress in D1
  subject: string;
  content: string; // html in D1 for full view, text for preview in getMails
  date: string; // Unix timestamp (number) in D1, converted to ISO string
  attachments?: string[]; // JSON string in D1, parsed to array
}

// 删除特定邮件
export async function deleteEmail(email: string, password: string, _id: string): Promise<boolean | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码 (email here is fromAddress)
    const authUser = await db.prepare("SELECT role FROM user WHERE email = ?1 AND password = ?2")
      .bind(email, hashedPassword)
      .first<{ role: string }>();

    if (!authUser) {
      return '401';
    }
    if (authUser.role !== 'admin' && authUser.role !== 'user') {
      return '403';
    }

    // 删除邮箱
    const emailId = parseInt(_id, 10);
    if (isNaN(emailId)) {
      return '400'; // Invalid _id format
    }

    const res = await db.prepare("DELETE FROM sent WHERE id = ?1 AND fromAddress = ?2")
      .bind(emailId, email)
      .run();

    if (res.meta.changes === 0) {
      return '404'; // Not found or not deleted (or not authorized if fromAddress didn't match)
    }
    return true;
  } catch (err) {
    console.error("deleteEmail (sent) error:", err);
    throw new Error(err instanceof Error ? err.message : '未知删除错误');
  }
}

// 返回特定邮件
export async function getEmail(email: string, password: string, _id: string): Promise<Mail | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码 (email here is fromAddress)
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
      "SELECT id, toAddress, subject, html, date, attachments FROM sent WHERE id = ?1 AND fromAddress = ?2"
    ).bind(emailId, email)
     .first<{ id: number; toAddress: string | null; subject: string | null; html: string | null; date: number | null; attachments: string | null }>();

    if (!emailData) {
      return '404';
    }

    return {
      _id: emailData.id.toString(),
      to: emailData.toAddress || '',
      subject: emailData.subject || '',
      content: emailData.html || '', // html for content
      date: emailData.date ? new Date(emailData.date * 1000).toISOString() : new Date(0).toISOString(),
      attachments: emailData.attachments ? JSON.parse(emailData.attachments) : []
    };
  } catch (err) {
    console.error("getEmail (sent) error:", err);
    throw new Error(err instanceof Error ? err.message : '未知获取错误');
  }
}

// 返回邮件列表, 内容仅需前 100 个字符
export async function getMails(email: string, password: string, limit: number, skip: number): Promise<Mail[] | string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    // 验证邮箱和密码 (email here is fromAddress)
    const authUser = await db.prepare("SELECT id FROM user WHERE email = ?1 AND password = ?2")
      .bind(email, hashedPassword)
      .first();

    if (!authUser) {
      return '401';
    }

    // 获取邮箱列表
    const sql = `
      SELECT id, toAddress, subject, text, date -- text for preview
      FROM sent
      WHERE fromAddress = ?1
      ORDER BY date DESC
      LIMIT ?2 OFFSET ?3;
    `;
    const { results } = await db.prepare(sql)
      .bind(email, limit, skip)
      .all<{ id: number; toAddress: string | null; subject: string | null; text: string | null; date: number | null; }>();

    const mails: Mail[] = (results || []).map(doc => ({
      _id: doc.id.toString(),
      to: doc.toAddress || '',
      subject: doc.subject || '',
      content: doc.text ? doc.text.slice(0, 100) : '', // Use text for content preview
      date: doc.date ? new Date(doc.date * 1000).toISOString() : new Date(0).toISOString(),
      attachments: [] // Not fetched in this query for list view
    }));
    
    return mails;
  } catch (err) {
    console.error("getMails (sent) error:", err);
    throw new Error(err instanceof Error ? err.message : '未知列表获取错误');
  }
}

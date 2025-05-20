'use server'

import { getDB, Env } from '@/app/lib/d1';
import sha256 from 'crypto-js/sha256';

export async function auth(email: string, password: string): Promise<string> {
  try {
    const db = getDB(process.env as any as Env);
    const hashedPassword = sha256(password).toString();

    const sql = `SELECT username FROM user WHERE email = ?1 AND password = ?2;`;
    const user = await db.prepare(sql).bind(email, hashedPassword).first<{ username: string }>();

    if (!user) {
      throw new Error('邮箱地址或密码错误');
    }
    return user.username;
  } catch (err) {
    // Log the error for server-side inspection if needed
    // console.error("Authentication error:", err); 
    throw new Error(err instanceof Error ? err.message : '未知错误');
  }
}
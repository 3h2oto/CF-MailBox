'use server'

import sha256 from 'crypto-js/sha256';
import { getDB, Env } from '@/app/lib/d1';

export async function registry(
  username: string,
  email: string,
  password: string,
  authCode: string = ''
): Promise<string> {
  const fullEmail = `${email}@${process.env.NEXT_PUBLIC_MAIL_SERVER}`;
  try {
    const db = getDB(process.env as any as Env);

    // 验证 authCode
    if (process.env.REGISTRY_KEY && authCode !== process.env.REGISTRY_KEY) {
      return '注册码错误';
    }

    // 查询是否已存在
    const checkUserSql = `SELECT id FROM user WHERE email = ?1;`;
    const existingUser = await db.prepare(checkUserSql).bind(fullEmail).first();
    if (existingUser) {
      return '邮箱已注册';
    }

    // 插入数据
    const hashedPassword = sha256(password).toString();
    const currentTime = Math.floor(Date.now() / 1000);
    const insertSql = `
      INSERT INTO user (username, email, password, role, active, createTime, updateTime)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7);
    `;
    await db.prepare(insertSql)
      .bind(
        username,
        fullEmail,
        hashedPassword,
        'user', // role
        1,      // active (true)
        currentTime, // createTime
        currentTime  // updateTime
      )
      .run();
      
    return '200';
  } catch (err) {
    // Log the error for server-side inspection if needed
    // console.error("Registry error:", err);
    throw new Error(err instanceof Error ? err.message : '未知错误');
  }
}
import PostalMime from 'postal-mime';
import { getDB, Env } from '@/app/lib/d1';

export async function POST(req: Request): Promise<Response> {
  // Get D1 database instance
  // Note: In a real worker, process.env is part of the Env. Here we cast for Cloudflare Pages/Next.js context
  const db = getDB(process.env as any as Env);

  // 从请求中解析邮件数据
  const { to: toAddress, mail, auth }: { from: string /* original from, not used for inbox.toAddress */, to: string, mail: string, auth: string } = await req.json();
  if (auth !== process.env.PEER_AUTH_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const data = await PostalMime.parse(mail);
  
  // 如果没有 text, 将 html 转换为 text 并移除所有标签
  if (!data.text && data.html) {
    data.text = data.html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '');
  }
  
  // 如果没有 html, 将 text 转换为 html (basic structure)
  if (!data.html && data.text) {
    data.html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            /* Basic dark mode responsiveness */
            @media (prefers-color-scheme: dark) {
              body { background-color: #333; color: #fff; }
            }
          </style>
        </head>
        <body>
          <pre>${data.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        </body>
      </html>
    `;
  }

  // Prepare data for D1 insertion
  const emailDate = data.date ? Math.floor(new Date(data.date).getTime() / 1000) : Math.floor(Date.now() / 1000);
  const attachmentsJson = data.attachments ? JSON.stringify(data.attachments) : '[]';

  const insertSql = `
    INSERT INTO inbox (messageId, fromAddress, fromName, toAddress, subject, text, html, date, attachments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  try {
    await db.prepare(insertSql)
      .bind(
        data.messageId || null,
        data.from?.address || null,
        data.from?.name || null,
        toAddress, // This is the `to` from the incoming JSON, representing the recipient mailbox
        data.subject || null,
        data.text || null,
        data.html || null,
        emailDate,
        attachmentsJson
      )
      .run();
    return new Response('OK');
  } catch (error) {
    console.error('Failed to insert email into D1:', error);
    // Consider what error response is appropriate
    // For now, mirroring the original behavior of not having specific error handling for insert
    // but logging it server-side.
    // If you want to return an error to the client:
    // return new Response('Failed to store email', { status: 500 });
    // For now, let's assume if it fails, it might be okay to still return OK if the service that called this doesn't care
    // However, it's better practice to return an error. Let's return 500.
    return new Response('Error processing email', { status: 500 });
  }
}
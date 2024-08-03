# MailBox 🚧 WIP
MailBox is a web application that allows you to send and receive emails serverlessly and costlessly with your custom domain.

## TODO
- [x] 身份验证和用户数据存储 (MongoDB)
- [x] 接收邮件功能 (Cloudflare Mail Workers -> Next.js -> MongoDB)
- [x] 注册功能 (服务端注册条件控制)
- [x] 单条邮件阅读组件
- [ ] 夜间模式
- [ ] 个人资料页面
- [ ] 发送邮件功能 (Resend)
- [ ] 已发送邮件页面
- [ ] 支持 Markdown 写邮件 (Marked)
- [ ] 找回密码功能 (向备用邮箱发送验证码)
- [ ] AI 总结邮件内容生成邮件摘要 (Cloudflare Workers AI)

## Usage
### 1 Get MongoDB Atlas URI
Create a new project in [MongoDB Atlas](https://www.mongodb.com/) and get the URI of the cluster.

> Currently, you need to manually create users in the `user` collection of the MongoDB database. The type definition can be found in `/app/COLL_TYPE.ts`.

### 2 Config Resend
Create a new project in [Resend](https://resend.com/), and create a new API key. Note that the domain you use in Resend should be the same as the domain you use in Cloudflare.

### 3 Deploy to Vercel
Deploy this `Next.js` project to `Vercel` with the following environment variables in `Vercel` or `.env` file.

| Variable | Description | Default | Required |
|:--------:|:-----------:|:-------:|:--------:|
| `RESEND_API_KEY` | API key of Resend | | Yes |
| `MONGODB_URI` | URI of MongoDB Atlas | | Yes |
| `PEER_AUTH_KEY` | For authenticating between Cloudflare Workers and Next.js | | Yes |
| `NEXT_PUBLIC_MAIL_SERVER` | The domain of your mail server, e.g. `mail.example.com` | | Yes |
| `REGISTRY_KEY` | If set, only users with this key can register | | |
| `NEXT_PUBLIC_REGISTRY_SET` | If `REGISTRY_KEY` is set, this should be set to `true` | | |

### 4 Config Workers Environment Variables
Create `/workers/wrangler.toml` and add the following content.

```toml
#:schema node_modules/wrangler/config-schema.json
name = "mail"
main = "src/index.ts"
compatibility_date = "2024-08-01"
compatibility_flags = ["nodejs_compat"]

[vars]
NEXT_ENDPOINT = "https://<YOUR_NEXTJS_PROJECT_DOMAIN>/api/receive"
PEER_AUTH_KEY = "<YOUR_PEER_AUTH_KEY>"
```

### 5 Deploy Workers
Run the following command to deploy the workers.

```bash
cd ./workers
bun install
bunx wrangler login
bun run deploy
```

### 6 Config Cloudflare Mail route
1. Go to your domain's Cloudflare dashboard.
2. Click on the `Email` tab.
3. Click on `Email Routing`.
4. Click on `Routing Rules`.
5. Set `Catch All` to forward all mail to the workers you just deployed.

## License
[GPL-3.0](./LICENSE)


# Migrating Next.js App from Vercel to Cloudflare Pages

This guide outlines the steps to migrate your Next.js application from Vercel to Cloudflare Pages.

## 1. Prerequisites
   - Ensure you have a Cloudflare account.
   - Ensure your project code is in a Git repository (GitHub, GitLab).

## 2. Set up Cloudflare Pages Project
   a. **Log in to Cloudflare:** Navigate to your Cloudflare dashboard.
   b. **Go to Pages:** In the sidebar, select "Workers & Pages", then click "Create application" and select the "Pages" tab. Click "Connect to Git".
   c. **Connect Git Repository:**
      - Choose the Git provider where your repository is hosted.
      - Select your project's repository.
      - Click "Begin setup".
   d. **Configure Build and Deployments:**
      - **Project name:** Choose a name for your Pages project.
      - **Production branch:** Select the branch you want to deploy from (e.g., `main`, `master`).
      - **Framework preset:** Select "Next.js" from the dropdown. Cloudflare Pages should automatically configure the build command and output directory.
      - **Build command:** Verify it's set to `npm run build` or `next build`.
      - **Output directory:** Verify it's set correctly for Next.js (Cloudflare usually handles this automatically, typically it will recognize it's a Next.js project and configure this to build to `.next` and also set up the `functions` directory correctly).
      - **Root directory (advanced):** If your Next.js app is not in the root of your repository, specify the directory here. Otherwise, leave it as is.
   e. **Environment Variables (Optional):**
      - If your application requires environment variables (e.g., API keys, database URLs), add them under "Environment variables (advanced)".
      - For this project, we haven't identified any specific environment variables that were in use on Vercel that need to be transferred. However, if you have any defined in your Vercel project settings (that are not in a `.env` file in the repository), you should add them here.
      - Click "Add variable" for each variable, providing its name and value.
   f. **Save and Deploy:**
      - Click "Save and Deploy".
      - Cloudflare Pages will now attempt to build and deploy your application. You can monitor the progress in the Cloudflare dashboard.

## 3. Test Your Deployment
   a. Once the deployment is complete, Cloudflare will provide you with a unique `*.pages.dev` URL (e.g., `your-project-name.pages.dev`).
   b. Access this URL in your browser.
   c. Thoroughly test your site:
      - Check all pages and navigation.
      - Verify images (especially those from `gravatar.com` as configured in `next.config.mjs`) are loading.
      - Test any interactive features or API calls if your application has them.
      - Check the browser's developer console for any errors.

## 4. Update Custom Domain DNS Records (After Successful Testing)
   a. Once you are satisfied that the Cloudflare Pages deployment is working correctly, you can point your custom domain to it.
   b. Log in to your domain registrar's dashboard (or Cloudflare if your DNS is managed there).
   c. Update your DNS records:
      - If you are using an apex domain (e.g., `yourdomain.com`), you will typically update the A record to point to the IP address(es) provided by Cloudflare Pages, or use a CNAME if your registrar supports CNAME flattening / ALIAS records. Refer to Cloudflare's documentation for the most current IP addresses or recommended CNAME setup for apex domains.
      - For subdomains (e.g., `www.yourdomain.com`), update the CNAME record to point to your `*.pages.dev` domain (e.g., `your-project-name.pages.dev`).
   d. DNS propagation may take some time.

## 5. Decommission Vercel Project (After DNS Propagation)
   a. After confirming your custom domain is correctly serving content from Cloudflare Pages and the deployment is stable, you can remove your project from Vercel.
   b. Go to your Vercel dashboard, navigate to the project settings, and delete the project.
   c. Ensure any domain configurations are also removed or updated in Vercel.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This app needs Next.js server rendering, Server Actions, and API routes. The
repository's `vercel.json` selects the Next.js framework, builds with
`npm run build`, and uses `.next` as the build directory. Serving only `public`
produces a successful deployment with working images but Vercel 404 responses
for the application routes.

In the Vercel project settings:

1. Set **Root Directory** to the repository root, where `package.json` and
   `vercel.json` live.
2. Set **Framework Preset** to **Next.js**. Remove any Output Directory override
   pointing to `public`, `out`, or `dist`; the Next.js default is `.next`.
3. Add `MONGODB_URI`, `SESSION_SECRET`, `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` to **Environment Variables**
   for Production. Use `.env.example` for the variable names. The local `.env`
   is intentionally ignored by Git and is not uploaded by a Git deployment.
4. Set `NEXT_PUBLIC_SITE_URL` to `https://mindjvines.vercel.app`, or the final
   custom domain. Do not use `http://localhost:3000` in Production.
5. Deploy the commit containing `vercel.json`. When redeploying, disable use of
   the existing build cache for the first deployment with the corrected settings.

Check `/`, `/subscriptions`, and `/admin/login` after deployment. Database
connectivity is also required to load plans and sign in to the admin panel.

See [Vercel build settings](https://vercel.com/docs/builds/configure-a-build)
and [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

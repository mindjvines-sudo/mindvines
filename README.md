# Mindvines

A journal programme website with an authenticated admin panel, built with
Next.js, MongoDB, and Cloudinary.

## Local development

Install dependencies with `npm ci`. Copy `.env.example` to `.env.local` and
fill in the database, session, and Cloudinary values. Keep environment files
private. Run `npm run dev` and open `http://localhost:3000`.

The admin entry point is `/admin`. To create an initial admin, follow the seed
instructions below.

## Checks

- `npm run lint`
- `npm run build`
- `npm run test:auth`
- `npm run test:subscriptions`

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

## Routes and authentication

| Route | Purpose |
| --- | --- |
| `/`, `/subscriptions` | Public homepage and published subscription plans |
| `/admin` | Authenticated redirect to the dashboard |
| `/admin/login` | Sign-in form; login is a Next.js Server Action |
| `/admin/dashboard` | Enquiry metrics and content summaries |
| `/admin/subscriptions`, `/admin/enquiries`, `/admin/media`, `/admin/settings` | Active subscription and site management |
| `/admin/blog`, `/admin/testimonials`, `/admin/pages` | Existing content editors, previews, and search results |
| `GET /api/admin/search` | Admin search box |
| `GET, POST /api/media` | Media listing and uploads |
| `GET, PATCH, DELETE /api/media/[id]` | Media details, metadata changes, and deletion |

All API routes above are used by the admin interface. They return JSON `401`
responses when signed out and check permissions before accessing protected data.
Form mutations use Server Actions rather than additional REST endpoints.

Login failures caused by server configuration or database connectivity display a
retry message. Vercel runtime logs use the `[admin-auth]` prefix and include the
failing stage, error name, and code, without raw connection strings or passwords.
MongoDB server selection is bounded to 10 seconds; the database must still be
reachable from Vercel and `MONGODB_URI` and `SESSION_SECRET` must be configured.
Audit-write failures are logged separately and do not prevent sign-in or sign-out.

To create an initial admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in
your local environment and run `npm run seed`. `SEED_ADMIN_NAME` is optional.
The command does not print the password or reset existing accounts.

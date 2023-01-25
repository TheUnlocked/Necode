# Necode

## How to run

### Pre-requisites

There are a few things you need to run Necode
- Node.js 16+
- A PostgreSQL database with an appropriate user role attached
- SSL Certificates (not necessary for local development)

Necode uses PNPM. For detailed instructions on how to install PNPM, see [the docs](https://pnpm.io/installation). However, for most users who have Node.js 16+ installed, you will want to run _one_ of the following commands:

```sh
# either
corepack enable
# or
npm install -g pnpm
```

Once PNPM is installed, to install the necessary dependencies for Necode, run:
```
pnpm install
```

Then you will need to configure `.env`. Copy `template.env` to `.env`, and fill out the fields.

After doing so, to populate your database with the necessary tables, run:
```
pnpm db:push
```

### Development

To start up the Necode frontend and the websocket server in development mode, run:
```
pnpm dev
```

This will also watch for changes and automatically recompile and reload when files are changed.

If you wish to serve the Next.js server over HTTPS, also run:
```
pnpm ssl-proxy
```

It will now also be available at `https://localhost:3010/`.
Note that without valid SSL certificates, you may have to bypass browser security warnings,
including for the websocket server. To bypass websocket security warnings, go to
`https://localhost:3001/socket.io/`.

To log in to the development environment, click "Sign In" and log in with a username and the `DEV_PASSWORD` you defined in `.env`. To create an administrator account, either follow the instructions in the "First-Time Setup" section, or run:

```
pnpx turbo db:seed
```

Then log in with the username `admin`.

### Production

Necode uses Vercel in production, and does not have pre-packaged instructions for running it on your own infrastructure. However, running `pnpm vercel-build` in the root directory will generate a `.next` folder in `apps/necode` that can be used even without Vercel. [This page](https://nextjs.org/docs/deployment#self-hosting) has some details on how to accomplish this.

## First-Time Setup

Sign in using the MSAL login that you configured in `.env`.
If you are working in a development environment, you can also configure GitHub authentication,
as well "email" signin (see Appendix 1).

You will now need to make a manual database change. While you can do this through `psql` or pgAdmin,
it may be easier to use Prisma Studio:

1. Navigate to the `packages/database` directory and run `pnpm studio`. Open the link it puts in the console.
2. Click "User".
3. Find the record for the user you just logged in as. Scroll to the right until you see a column called "rights".
4. Double click the "rights" field on the record for your user and change the value to "Admin".
5. Click "Save 1 change" on the top.

Now navigate to `/admin/createClassroom`. You should see a field asking for a display name.
If you see an error instead, refresh. Enter a display name for the classroom you are about to create.
For example, "Test Classroom".

Once you've chosen a display name, press "Create" and wait a few moments. It may take some time to load the newly created classroom.
Eventually you should come to the manage classroom page. From here you can create activities and manage your classroom.

### Appendix 1: Email Signin

**Note:** This only works in dev mode.

1. Navigate to `/api/auth/signin` and enter an email address. This can be anything, no actual email will be sent.
2. In the console output of the Next.js server, a link will be emitted. Paste that link into your browser.

You should now be signed in.


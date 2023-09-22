![Necode](https://user-images.githubusercontent.com/10186337/217269653-b2aa1541-1b42-451f-8e9d-62c1dbccc344.png)

---

Necode is a highly modular educational programming environment for collaborative _in-class_ activities.
It has several features which sets it apart from existing solutions:

* **Peer-to-peer communication**: Most collaborative programming environments operate by having each user send data to a server, and then the server sends their data to each other user they are connected to. Necode bypasses this, only using a server for initial linking and signalling, and then having users talk directly through peer-to-peer connections. This makes Necode require significantly fewer server resources.
* **Client-side compuatation**: All execution of user code is performed client-side rather than on a server in the cloud. This has some drawbacks such as making it significantly more challenging to implement support for many languagues. However, not only does this approach significantly reduce the necessary server resources to run Necode, but it also enables use of the built-in browser development tools (such as for reading logs or debugging JavaScript) and allows code in some languages to directly interact with the DOM.
* **Communication with non-code artifacts**: Usually when environments advertise collaborative programming, they are referring to shared editors, one kind of collaborative programming in which each user's edits to their code gets propagated to all of the other users. Necode abstracts this, allowing not just code artifacts, but any artifacts to be shared, and to be shared asymmetrically with only certain individuals rather than everyone.
* **Plugin API** (in progress): New language support, activities (i.e. frontend experiences), and RTC-linking policies can be developed by third-party developers and dynamically plugged into existing Necode instances.

## Screenshots

![A screenshot of the classroom home view](https://user-images.githubusercontent.com/10186337/217266961-99180865-e851-4131-976e-c6c5a78a7038.png)

![A screenshot of configuring an activity](https://user-images.githubusercontent.com/10186337/217267380-fe793dd6-a26c-4ac4-a970-b797643c47ca.png)

![A screenshot of a teacher trying out an activity they've made with a simulated student](https://user-images.githubusercontent.com/10186337/217273771-d0fdab82-40dd-4217-9d5b-a434e24b04f3.png)

## Papers

* [MQP Report (2022)](https://www.necode.org/papers/mqp_report_2022.pdf) (no peer review)
* [Master's Thesis (2023)](https://www.necode.org/papers/masters_thesis_2023.pdf) (no peer review)

## Offshoot projects

Necode has spawned a number of projects which, though originally designed for use in Necode, exist independently from it. These include:

* [`mike-language`](https://github.com/TheUnlocked/mike-language) (plus [`mike-vscode`](https://github.com/TheUnlocked/mike-vscode)): a programming language for defining simple event-based programs with serializable state.
* [`use-dnd`](https://github.com/TheUnlocked/use-dnd): a minimal library for using HTML5 drag-and-drop in React, based on [`react-dnd`](https://github.com/react-dnd/react-dnd).
* [`scheme-js`](https://github.com/TheUnlocked/scheme-js): a library for using a WASM build of Chez Scheme on the web.

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
pnpm db:migrate:dev
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

#### Necode Next.js

Necode uses Vercel in production, and does not have pre-packaged instructions for running it on your own infrastructure. However, running `pnpm vercel-build` in the root directory will generate a `.next` folder in `apps/necode` that can be used even without Vercel. [This page](https://nextjs.org/docs/deployment#self-hosting) has some details on how to accomplish this.

#### Necode Websocket Server

Necode also has a required websocket server, which can be built with `wsserver:build`. This cannot be hosted on Vercel, and should be run on a server somewhere. [`pm2`](https://pm2.keymetrics.io/) is a decent option for daemonizing it. It will also require a copy of the `.env` file in your working directory (`process.cwd()`), which may or may not be the same directory that the build is contained in.

## First-Time Setup

Sign in using the MSAL login that you configured in `.env`.
If you are working in a development environment, you can also configure GitHub authentication,
as well as log in with any username using the password you defined with the `DEV_PASSWORD` environment variable.

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

Once you've chosen a display name, press "Create" and wait a few moments.
It may take some time to load the newly created classroom, especially in a development environment.
Eventually you should come to the manage classroom page. From here you can create activities and manage your classroom.

## Contributing

### Changing the database

To make a change to the database, modify `packages/database/schema.prisma`. Run `pnpm i` or `pnpx turbo run generate` to update the generated code and then run `pnpm db:push` in `packages/database` to apply the changes to your local database.

Once you're done and would like to make a PR, run `pnpm db:migrate:dev` to generate the migration file. This may require resetting your local database, though it should get re-populated with some minimal seed data. You can reset your development database to the initial seeded state with `pnpm db:migrate:reset`.

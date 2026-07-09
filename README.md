# TempChat — a 72-hour social chat app

A full-stack chat app: React (Vite) frontend + Node/Express + Socket.io backend + MongoDB.
Users sign up with a username and password, send friend requests, and chat 1-to-1 in real time.

**Users are permanent.** Every *message* and every *friendship/request*, however,
auto-deletes itself 72 hours after it was created — enforced by MongoDB TTL indexes,
not just hidden in the UI. Nothing needs to run periodically to clean up; MongoDB does
it in the background even if the server is offline when the deadline hits.

## Project structure

```
tempchat/
├── backend/      Express API + Socket.io, MongoDB models, JWT auth
└── frontend/     React (Vite) single-page app
```

## Features

- Register / login with username + password (bcrypt-hashed passwords, JWT sessions)
- Search for other users, send/accept/reject friend requests
- Real-time notifications when someone sends or accepts a request (if you're online)
- 1-to-1 chat, only possible between accepted friends (enforced server-side)
- Real-time messaging via Socket.io, with a typing indicator
- Chat history persists (until it expires) so refreshing doesn't lose messages
- A visible countdown ("Xh Ym left") on friends/requests so people know the reset is coming
- Messages, friend requests, and friendships **auto-delete 72 hours after creation** via
  MongoDB TTL indexes — no cron job required

## 1. Prerequisites

- Node.js 18+
- A MongoDB database — local (`mongodb://127.0.0.1:27017`) or a free
  [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```
MONGO_URI=mongodb://127.0.0.1:27017/tempchat
JWT_SECRET=some_long_random_string
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
DATA_TTL_SECONDS=259200
```

`DATA_TTL_SECONDS` is the 72-hour window (259200 seconds). Lower it (e.g. to `300`
for 5 minutes) if you want to demo the auto-expiry quickly without waiting 3 days.

**Important MongoDB note:** TTL index timing is set when the index is first created.
If you change `DATA_TTL_SECONDS` after the app has already run once, drop the old
index so MongoDB rebuilds it with the new value:
```js
// in the mongo shell / MongoDB Compass, against your database
db.messages.dropIndex("createdAt_1")
db.friendships.dropIndex("createdAt_1")
```
Then restart the server — Mongoose will recreate the indexes with the new TTL.

Run it:
```bash
npm run dev
```
You should see `MongoDB connected: ...` and `TempChat API + sockets listening on http://localhost:5000`.

## 3. Frontend setup

In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open the printed URL (usually http://localhost:5173).

## 4. Using the app

1. Register two accounts (e.g. in two browser windows, or one normal + one incognito).
2. From one account, go to **Find people**, search for the other username, click **Add friend**.
3. On the other account, go to **Requests**, click **Accept**.
4. Both accounts now see each other under **Friends** — click a friend to open the chat.
5. Messages sync instantly between both windows via Socket.io.

## API reference

All routes except `/register` and `/login` require `Authorization: Bearer <token>`.

| Method | Route                     | Description                                  |
|--------|---------------------------|-----------------------------------------------|
| POST   | /api/auth/register        | Create an account (username + password)       |
| POST   | /api/auth/login           | Log in, returns a JWT                         |
| GET    | /api/auth/me              | Get the logged-in user                        |
| GET    | /api/users?search=        | List/search other users + relationship status |
| GET    | /api/friends              | Get `{ friends, incoming, outgoing }`         |
| POST   | /api/friends/request      | Send a friend request `{ username }`          |
| POST   | /api/friends/:id/accept   | Accept a pending request                       |
| DELETE | /api/friends/:id          | Reject a request, or unfriend an accepted one |
| GET    | /api/messages/:userId     | Get conversation history with a friend        |
| POST   | /api/messages/:userId     | Send a message via REST (fallback to sockets) |

### Socket.io events

| Direction | Event                        | Payload                          |
|-----------|-------------------------------|-----------------------------------|
| emit      | `send_message`                | `{ to, text }` (+ ack callback)   |
| emit      | `typing` / `stop_typing`      | `{ to }`                           |
| listen    | `new_message`                 | the saved message                 |
| listen    | `friend_request_received`     | `{ friendshipId, from }`          |
| listen    | `friend_request_accepted`     | `{ friendshipId, by }`            |
| listen    | `typing` / `stop_typing`      | `{ from }`                         |

The socket connection authenticates with the same JWT as the REST API, passed as
`socket.handshake.auth.token`.

## Notes on security

- Passwords are hashed with bcrypt — plaintext is never stored.
- Every friend/message action checks that the two users are actually friends
  (`status: "accepted"`) before allowing a chat, both over REST and over sockets.
- JWTs are signed with `JWT_SECRET` — use a long random value and never commit your real `.env`.

## Deploying later

- Backend: any Node host that supports WebSockets (Render, Railway, Fly.io) + MongoDB Atlas.
- Frontend: `npm run build` → deploy the `dist/` folder to Vercel/Netlify.
- Update `CLIENT_ORIGIN` (backend) and `VITE_API_URL` / `VITE_SOCKET_URL` (frontend) to your
  deployed URLs, and make sure your host allows WebSocket connections through to the backend.

# CivicSense — Community Issue Tracker

A full-stack civic issue reporting and management platform where **citizens** report local infrastructure problems (potholes, broken streetlights, water leaks), **government authorities** resolve them, and **admins** oversee the entire workflow. Built with React, Express.js, MongoDB, and real-time notifications via Socket.IO.

---

## Features

### Citizens

- **Report Issues** — Submit problems with title, description, category, severity, geolocation, photos, and videos
- **Dashboard** — Browse all community issues with search, filters (category, severity, status), and pagination
- **My Posts** — Track personal submissions and their resolution status
- **Upvote & Comment** — Engage with community issues to boost priority
- **Resolution Confirmation** — Accept or reject authority resolution attempts before issues are closed
- **Real-time Notifications** — Instant alerts for status updates, comments, and resolutions via Socket.IO

### Authorities

- **Authority Dashboard** — View assigned issues sorted by AI-calculated priority score
- **Status Management** — Update issue status with status notes (new → in-progress → pendingResolution → resolved)
- **Location-based Filtering** — See issues within 50 km of their registered location
- **Profile Management** — Update contact info, department, and zone

### Admin

- **Admin Dashboard** — Full overview of all issues across the platform
- **Issue Assignment** — Assign issues to specific authorities by department
- **Authority Management** — View all registered authorities
- **CSV Export** — Download all issue data for reporting

### Shared Pages

- **Interactive Map** — Leaflet-powered map view of all issues with status-colored markers
- **Analytics Dashboard** — Charts showing issues by category, severity, monthly trends, and resolution time (Recharts)
- **Community Leaderboard** — Top reporters and most active authorities with podium display
- **User Profile** — View/edit profile and change password
- **Dark/Light Theme** — Toggle between themes with localStorage persistence

---

## Tech Stack

| Layer         | Technology                                                      |
| ------------- | --------------------------------------------------------------- |
| **Frontend**  | React 19, Vite 7, React Router DOM, Lucide React, Recharts, Leaflet |
| **Backend**   | Node.js, Express.js, Socket.IO                                 |
| **Database**  | MongoDB Atlas (Mongoose ODM)                                   |
| **Auth**      | JWT (Bearer token + httpOnly cookies)                           |
| **Storage**   | Cloudinary (image/video uploads)                                |
| **Real-time** | Socket.IO (notifications, live updates)                         |

---

## Project Structure

```
civic-sense-v1/
├── backend/
│   ├── server.js                         # Entry point — HTTP server + Socket.IO + scheduler
│   ├── package.json                      # Backend dependencies
│   ├── .env                              # Environment variables (not committed)
│   ├── uploads/                          # Temporary multer upload directory
│   ├── test/
│   │   └── priority.service.test.js      # Unit tests for priority scoring
│   └── src/
│       ├── app.js                        # Express app setup — CORS, middleware, routes
│       ├── db/
│       │   └── db.js                     # MongoDB connection via Mongoose
│       ├── controllers/
│       │   ├── auth.controller.js        # Register, login, logout, profile (citizen/authority/admin)
│       │   ├── posts.controller.js       # CRUD, upvotes, comments, assignment, analytics, leaderboard
│       │   ├── notifications.controller.js  # Fetch & mark-read notifications
│       │   └── upload.controller.js      # Cloudinary file upload handler
│       ├── models/
│       │   ├── citizen.model.js          # Citizen schema (name, email, address, password)
│       │   ├── authority.model.js        # Authority schema (name, email, phone, department, zone, location)
│       │   ├── admin.model.js            # Admin schema (name, email, password)
│       │   ├── posts.model.js            # Post schema (title, description, category, severity, media, comments, priority)
│       │   └── notification.model.js     # Notification schema (recipient, type, title, message, read status)
│       ├── routes/
│       │   ├── auth.routes.js            # /api/auth/* — register, login, logout, profile, password
│       │   ├── posts.routes.js           # /api/posts/* — CRUD, upvotes, comments, assign, analytics
│       │   └── notifications.routes.js   # /api/notifications/* — fetch and mark-read
│       ├── middlewares/
│       │   ├── auth.middleware.js         # JWT verification, role guards (citizen, authority, admin)
│       │   ├── validate.middleware.js     # ObjectId param validation, pagination query validation
│       │   ├── upload.middleware.js       # Multer config — disk storage, file filters, 50MB limit
│       │   └── security.middleware.js     # In-memory rate limiter (120 req/min per IP)
│       └── services/
│           ├── socket.service.js         # Socket.IO init, room management, emitToUser()
│           ├── storage.service.js        # Cloudinary upload wrapper
│           ├── priority.service.js       # Priority score calculation (severity + upvotes + location)
│           └── autoResolve.service.js    # Scheduler — auto-deletes stale pendingResolution posts after 24h
│
├── frontend/
│   ├── index.html                        # HTML entry point
│   ├── package.json                      # Frontend dependencies
│   ├── vite.config.js                    # Vite configuration
│   ├── eslint.config.js                  # ESLint configuration
│   ├── public/
│   │   └── vite.svg                      # Favicon
│   └── src/
│       ├── main.jsx                      # React DOM root
│       ├── App.jsx                       # Router setup — all routes, protected/public route guards
│       ├── App.css                       # Global app styles
│       ├── index.css                     # CSS variables, dark/light theme definitions, base styles
│       ├── api/
│       │   ├── client.js                 # Fetch wrapper — base URL, auth headers, token handling
│       │   ├── auth.js                   # Auth API calls (register, login, logout, profile, password)
│       │   ├── posts.js                  # Posts API calls (CRUD, upvote, comment, analytics, leaderboard)
│       │   └── notifications.js          # Notification API calls (fetch, mark-read)
│       ├── context/
│       │   ├── AuthContext.jsx           # Auth state — user, token, login/logout, role detection
│       │   └── ThemeContext.jsx          # Theme toggle — dark/light mode with localStorage
│       ├── components/
│       │   ├── PostCard.jsx              # Reusable issue card (title, status, severity, upvotes)
│       │   ├── PostCard.css
│       │   └── layout/
│       │       ├── DashboardLayout.jsx   # Sidebar + Outlet layout wrapper
│       │       ├── DashboardLayout.css
│       │       ├── Sidebar.jsx           # Navigation sidebar — role-based links, theme toggle
│       │       └── Sidebar.css
│       └── pages/
│           ├── LoginPage/                # Login & register forms for all 3 roles
│           ├── CitizenDashboard/         # All issues feed — search, filters, pagination
│           ├── ReportIssuePage/          # Issue creation form with media upload & geolocation
│           ├── PostDetailPage/           # Full issue view — image lightbox, comments, upvote, resolve
│           ├── MyPostsPage/             # User's own submissions with status tracking
│           ├── AuthorityDashboard/       # Assigned issues — status updates with notes
│           ├── AdminDashboard/           # Admin overview — assignment, CSV export
│           ├── NotificationsPage/        # Real-time notification feed with mark-as-read
│           ├── ProfilePage/             # Profile editing + password change
│           ├── MapView/                 # Interactive Leaflet map of all geolocated issues
│           ├── AnalyticsPage/           # Charts — category, severity, monthly trends, resolution time
│           └── LeaderboardPage/         # Top reporters & authorities with podium + table
│
└── .gitignore                            # Root gitignore — .env, node_modules, dist, uploads
```

---

## API Endpoints

### Auth (`/api/auth`)

| Method  | Endpoint                  | Auth     | Description                  |
| ------- | ------------------------- | -------- | ---------------------------- |
| POST    | `/citizen/register`       | Public   | Register citizen             |
| POST    | `/citizen/login`          | Public   | Login citizen                |
| POST    | `/citizen/logout`         | Public   | Logout citizen               |
| POST    | `/authority/register`     | Public   | Register authority           |
| POST    | `/authority/login`        | Public   | Login authority              |
| POST    | `/authority/logout`       | Public   | Logout authority             |
| PATCH   | `/authority/location`     | Token    | Update authority geolocation |
| POST    | `/admin/register`         | Public   | Register admin               |
| POST    | `/admin/login`            | Public   | Login admin                  |
| POST    | `/admin/logout`           | Public   | Logout admin                 |
| GET     | `/admin/authorities`      | Admin    | List all authorities         |
| GET     | `/profile`                | Token    | Get current user profile     |
| PATCH   | `/profile`                | Token    | Update profile fields        |
| POST    | `/change-password`        | Token    | Change password              |

### Posts (`/api/posts`)

| Method  | Endpoint                          | Auth      | Description                          |
| ------- | --------------------------------- | --------- | ------------------------------------ |
| GET     | `/`                               | Public    | Get all posts (paginated, filterable)|
| POST    | `/create`                         | Citizen   | Create post with media               |
| GET     | `/my-posts`                       | Token     | Get logged-in user's posts           |
| GET     | `/summary`                        | Public    | Quick stats summary                  |
| GET     | `/analytics`                      | Public    | Category, severity, monthly stats    |
| GET     | `/leaderboard`                    | Public    | Top reporters & authorities          |
| GET     | `/:id`                            | Public    | Get single post by ID                |
| PATCH   | `/:id`                            | Token     | Update post (status, statusNote)     |
| DELETE  | `/:id`                            | Token     | Delete post                          |
| PATCH   | `/:id/assign`                     | Admin     | Assign post to authority             |
| POST    | `/:id/upvote`                     | Citizen   | Upvote a post                        |
| DELETE  | `/:id/upvote`                     | Citizen   | Remove upvote                        |
| POST    | `/:id/confirm-resolution`         | Citizen   | Confirm resolution                   |
| POST    | `/:id/reject-resolution`          | Citizen   | Reject resolution                    |
| GET     | `/:id/comments`                   | Public    | Get post comments                    |
| POST    | `/:id/comments`                   | Token     | Add comment                          |
| DELETE  | `/:id/comments/:commentId`        | Token     | Delete comment                       |

### Notifications (`/api/notifications`)

| Method  | Endpoint          | Auth   | Description                 |
| ------- | ----------------- | ------ | --------------------------- |
| GET     | `/my`             | Token  | Get user's notifications    |
| PATCH   | `/:id/read`       | Token  | Mark notification as read   |

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/civic-sense-v1-db
JWT_SECRET=your_jwt_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (Vercel Environment Variable)

```env
VITE_API_URL=https://your-backend-domain.com/api
```

---

## Local Development

### Prerequisites

- Node.js 20+
- MongoDB running locally (or Atlas URI)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/civic-sense-v1.git
cd civic-sense-v1

# Backend
cd backend
npm install
# Create .env file with variables listed above
npm run dev        # Starts on http://localhost:3000

# Frontend (new terminal)
cd frontend
npm install
npm run dev        # Starts on http://localhost:5173
```

---

## Deployment

| Service        | What                  | Free Tier          |
| -------------- | --------------------- | ------------------ |
| **Vercel**     | Frontend hosting      | Unlimited          |
| **Render**     | Backend hosting       | 750 hrs/month      |
| **MongoDB Atlas** | Database           | 512 MB M0 cluster  |
| **Cloudinary** | Image/video storage   | 25 GB bandwidth    |

### Deploy Backend (Render)

1. Push code to GitHub
2. Create new **Web Service** on [Render](https://render.com)
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `node server.js`
6. Add all environment variables from `.env`
7. Set `FRONTEND_URL` to your Vercel domain

### Deploy Frontend (Vercel)

1. Import GitHub repo on [Vercel](https://vercel.com)
2. **Root Directory:** `frontend`
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. Add env variable: `VITE_API_URL=https://your-backend.onrender.com/api`

---

## Priority Score Algorithm

Each issue receives a dynamic priority score:

```
priorityScore = (severityWeight × 5) + (upvotes × 2) + locationPriority
```

| Severity | Weight |
| -------- | ------ |
| Low      | 1      |
| Medium   | 2      |
| High     | 3      |

- **Upvotes** — Community engagement multiplied by 2
- **Location Priority** — 0-10 based on geographic urgency

---

## Resolution Flow

```
Citizen reports → Admin assigns authority → Authority marks "pendingResolution"
                                            ↓
                   Citizen confirms (resolved) ← or → Citizen rejects (back to in-progress)
                                            ↓
                   If no response in 24h → Auto-resolved & post deleted
```

---

## License

MIT

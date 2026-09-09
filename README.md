# ClientHub - B2B SaaS CRM Platform

A production-ready multi-tenant B2B SaaS CRM platform for managing clients, leads, sales opportunities, tasks, activities, and team members.

## 🏗️ Architecture

```
ClientHub/
├── backend/          # NestJS API (TypeScript)
├── frontend/         # React + Vite + TypeScript + Tailwind CSS
├── docker-compose.yml
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB 8.x with Mongoose
- **Cache/Queue**: Redis + BullMQ (with in-memory fallback)
- **Auth**: JWT Access/Refresh tokens with rotation
- **Email**: Brevo (Sendinblue)
- **Storage**: Cloudinary
- **API Docs**: Swagger/OpenAPI
- **Validation**: class-validator + class-transformer

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **State Management**: TanStack Query (React Query) + React Context
- **Forms**: React Hook Form + Zod
- **Routing**: React Router 6
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit
- **Notifications**: react-hot-toast

## ✨ Features (Phase 1)

### 🔐 Authentication
- User registration with organization creation
- Login/Logout with JWT tokens
- Email verification
- Forgot/Reset password
- Change password
- Token rotation & refresh
- Rate limiting on auth endpoints

### 🏢 Multi-Tenant Organizations
- Organization CRUD
- Member management (invite, roles, status)
- Organization settings & branding
- Logo upload (Cloudinary)
- Invitations with email

### 👥 Users & RBAC
- Roles: Admin, Manager, Sales, Employee
- Permission-based access control
- User profiles & avatars
- Activate/deactivate users
- Role assignment

### 📊 Dashboard
- Key metrics (clients, leads, deals, tasks, conversion rate)
- Client growth chart
- Lead conversion funnel
- Sales pipeline visualization
- Revenue overview
- Recent activities
- Upcoming follow-ups

### 👥 Client Management
- Full CRUD with contacts
- Search, filter, sort, pagination
- Company info, addresses, tags, notes
- Assigned team member
- Related deals, tasks, activities

### 🎯 Lead Management
- Lead pipeline (New → Contacted → Qualified → Proposal → Negotiation → Won/Lost)
- Kanban board view
- Lead scoring
- Lead sources
- Convert lead to client
- Table & Kanban views

### 💰 Deal Management
- Sales pipeline stages
- Deal value & probability
- Expected close dates
- Kanban pipeline with drag-drop
- Stage transition validation
- Weighted pipeline values

### ✅ Task Management
- Statuses: To Do, In Progress, Completed, Cancelled
- Priorities: Low, Medium, High, Urgent
- Due dates with overdue detection
- Related to clients, leads, deals
- Kanban board by status

### 📝 Activity Timeline
- Unified activity feed
- Types: Notes, Calls, Meetings, Emails, Tasks, Status Changes
- Auto-logged from other modules
- Entity-specific timelines

### 🔔 Notifications
- In-app notifications
- Types: Lead assigned, Task assigned, Task due, Deal updated, etc.
- Real-time polling
- Mark read/unread
- BullMQ background processing

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 6+
- Redis 7+ (optional - uses in-memory fallback)
- pnpm or npm

### Installation

```bash
# Clone and navigate
cd ClientHub

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run start:dev

# Frontend setup (new terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Application
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/clienthub

# JWT (use strong secrets in production!)
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (optional - for BullMQ)
REDIS_URL=redis://localhost:6379

# Cloudinary (required for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Brevo (required for emails)
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=ClientHub

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Swagger
SWAGGER_ENABLED=true
SWAGGER_PATH=api/docs
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:3000/api/v1
```

## 📚 API Documentation

When running locally, Swagger UI is available at:
- http://localhost:3000/api/docs

### Key Endpoints

```
/api/v1/auth           - Authentication
/api/v1/organizations  - Organization management
/api/v1/users          - User management
/api/v1/clients        - Client management
/api/v1/leads          - Lead management
/api/v1/deals          - Deal management
/api/v1/tasks          - Task management
/api/v1/activities     - Activity timeline
/api/v1/notifications  - Notifications
/api/v1/dashboard      - Dashboard analytics
```

## 🌱 Demo Data

Seed the database with demo data:

```bash
cd backend
npm run seed
```

This creates:
- Demo organization
- 4 users (Admin, Manager, Sales, Employee) - all password: `demo123`
- 5 clients with contacts
- 6 leads across pipeline stages
- 5 deals in pipeline
- 8 tasks with various statuses
- Sample activities

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e
npm run test:cov

# Frontend tests
cd frontend
npm run test
```

## 🏗️ Build for Production

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
# Deploy dist/ folder to Vercel/Netlify
```

## 🚢 Deployment

### Backend (Render/Railway/Heroku)
1. Set all environment variables
2. Ensure MongoDB Atlas and Redis are accessible
3. Run `npm run build && npm run start:prod`

### Frontend (Vercel/Netlify)
1. Connect repository
2. Set `VITE_API_URL` to production API URL
3. Build command: `npm run build`
4. Output directory: `dist`

### Database (MongoDB Atlas)
1. Create cluster
2. Add connection string to `MONGODB_URI`
3. Configure IP whitelist

### Redis (Upstash/Redis Cloud)
1. Create Redis instance
2. Add connection string to `REDIS_URL`

## 📁 Project Structure

### Backend
```
backend/src/
├── auth/              # Authentication module
├── users/             # User management
├── organizations/     # Multi-tenant orgs
├── roles/             # RBAC roles & permissions
├── clients/           # Client management
├── leads/             # Lead pipeline
├── deals/             # Deal pipeline
├── tasks/             # Task management
├── activities/        # Activity timeline
├── notifications/     # Notifications
├── dashboard/         # Analytics
├── seed/              # Database seeding
├── common/            # Guards, decorators, filters, pipes, interceptors
├── config/            # Configuration
├── database/          # Mongoose connection
├── queue/             # Queue abstraction (BullMQ + Memory)
├── email/             # Brevo email service
├── storage/           # Cloudinary storage
└── main.ts            # Bootstrap
```

### Frontend
```
frontend/src/
├── components/        # Reusable UI components
│   └── ui/           # Base components (Button, Input, Modal, etc.)
├── layouts/          # Page layouts (MainLayout, AuthLayout)
├── pages/            # Route-level pages (lazy loaded)
├── features/         # Feature modules
│   ├── auth/
│   ├── dashboard/
│   ├── clients/
│   ├── leads/
│   ├── deals/
│   ├── tasks/
│   ├── activities/
│   ├── notifications/
│   ├── settings/
│   └── users/
├── hooks/            # Custom React hooks
├── services/         # API client, axios instance
├── api/              # Typed API calls per module
├── types/            # TypeScript types
├── utils/            # Formatters, helpers
├── routes/           # Router configuration
├── contexts/         # React Context providers
└── App.tsx           # Main app component
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- React team for React 18
- Tailwind CSS for the utility-first CSS
- All open-source contributors
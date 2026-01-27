# 📋 Todo App - Full-stack Project Management

A comprehensive todo application with member management, built with modern web technologies.

## 🚀 Features

### 🎯 Core Functionality
- **User Authentication**: Google OAuth 2.0 + Local login/registration
- **Project Management**: Create, manage projects with member collaboration
- **Task Management**: Full CRUD operations with status tracking
- **Member Management**: Add/remove members from projects with role-based permissions
- **Real-time Notifications**: Live updates via Socket.IO
- **Admin Dashboard**: User and project management interface

### 🛠️ Technical Features
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Modern UI**: Beautiful components with shadcn/ui
- **Real-time Updates**: Socket.IO integration
- **File Uploads**: Task attachments support
- **Comments**: Task discussion system
- **Role-based Access**: Owner, Editor, Viewer permissions

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **Vite** - Fast development server
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Lucide React** - Beautiful icons
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL** - Relational database
- **JWT** - Authentication tokens
- **Socket.IO** - Real-time server
- **Multer** - File upload handling

## 📦 Installation

### Prerequisites
- Node.js 18+
- MySQL 8+
- Google OAuth credentials (optional)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/HongPhong1111/Website_Todo.git
cd Website_Todo
```

2. **Backend Setup**
```bash
cd backend
npm install
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your database and OAuth credentials
```

4. **Database Setup**
```bash
mysql -u root -p < sql/schema.sql
```

5. **Frontend Setup**
```bash
cd frontend
npm install
```

## 🚀 Running the Application

### Method 1: Manual Start

1. **Start Backend**
```bash
cd backend
npm start
```

2. **Start Frontend**
```bash
cd frontend
npm run dev
```

### Method 2: Using Scripts

1. **Start Backend**
```bash
cd backend && npm start
```

2. **Start Frontend (with port fix)**
```bash
./start-frontend.sh
```

## 🌐 Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Admin Login**: admin@todo.local / admin123

## 📁 Project Structure

```
Website_Todo/
├── backend/
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── middleware/ # Auth middleware
│   │   ├── config/     # Database config
│   │   └── utils/      # Helper functions
│   ├── sql/            # Database schema
│   └── uploads/        # File uploads
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/      # Page components
│   │   ├── api/        # API client
│   │   └── auth/       # Authentication
│   └── public/         # Static assets
└── README.md
```

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=todo_db

# JWT
JWT_SECRET=your_jwt_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_ORIGIN=http://localhost:5173

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## 🎯 Usage

### For Users
1. **Register/Login**: Create account or use Google OAuth
2. **Create Projects**: Start new projects
3. **Add Members**: Invite collaborators to projects
4. **Manage Tasks**: Create, update, and track tasks
5. **Collaborate**: Comment on tasks and upload files

### For Admins
1. **Access Admin Dashboard**: Manage users and projects
2. **User Management**: View and manage all users
3. **Project Oversight**: Monitor all project activities

## 🔐 Authentication

- **Local Auth**: Email/password with JWT tokens
- **Google OAuth**: One-click Google login
- **Session Management**: Secure token handling
- **Role-based Access**: Different permissions for different roles

## 📱 Features in Detail

### Member Management
- Add users to projects by email search
- Role-based permissions (Owner, Editor, Viewer)
- Real-time member list updates
- Permission validation

### Task Management
- Create, read, update, delete tasks
- Status tracking (Todo, In Progress, Done)
- Task assignments to team members
- Comments and discussions
- File attachments

### Real-time Features
- Live task updates
- Instant notifications
- Real-time member status
- Live project activity feeds

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Kill processes on ports 4000 and 5173
   lsof -ti:4000,5173 | xargs kill -9
   ```

2. **Database Connection**
   - Ensure MySQL is running
   - Check .env database credentials
   - Verify database exists

3. **OAuth Issues**
   - Verify Google OAuth credentials
   - Check CLIENT_ORIGIN in .env
   - Ensure redirect URIs match

4. **Frontend Build Issues**
   ```bash
   # Clear Vite cache
   rm -rf frontend/node_modules/.vite
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- React team for the amazing framework
- Vite for the blazing fast build tool
- TailwindCSS for the utility-first CSS
- shadcn/ui for the beautiful components
- Socket.IO for real-time communication

---

**Built with ❤️ by HongPhong1111**

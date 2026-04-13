🚀 Node.js Backend API
📌 Prerequisites
Node.js (v16 or above)
npm or yarn
Database (MongoDB)
📥 Clone the Repository
git clone <backend-repo-url>
cd <backend-folder>
📦 Install Dependencies
npm install
⚙️ Environment Variables

Create a .env file in root:

Example:
PORT=3000
DB_URI=your_database_connection_string
JWT_SECRET=your_secret_key
▶️ Run the Server
For development:
npm run dev
For production:
node server.js

🌐 Server will run at:
👉 http://localhost:3000/

📁 Project Structure
/routes        → API routes
/models        → Database models
/controllers   → Business logic
/middleware    → Auth, validation, etc.
🔗 API Base URL
http://localhost:3000/api/
🚀 Usage
Start database
Run server → npm run dev
Use API via frontend or Postman
👑 Admin Login (Default)

For testing and development, a hardcoded admin account is available:

Email: admin@gmail.com
Password: admin123
✅ Features:
Logs in as Admin
Receives JWT token with role: admin
Can access protected admin routes
🔐 Example Admin Route:
GET /api/admin
Authorization: Bearer <your_token>

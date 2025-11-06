# LifeFlow Blood Bank Management System

A comprehensive web-based blood bank management system built with Node.js, Express, MongoDB, and modern frontend technologies.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure login and registration system
- **Role-based Access**: Admin, Staff, and Donor roles
- **Dashboard**: Real-time statistics and overview
- **Donor Management**: Complete CRUD operations for blood donors
- **Request Management**: Blood request creation and tracking
- **Inventory Management**: Blood stock monitoring and alerts
- **Settings**: User preferences and system configuration

### Advanced Features
- **Real-time Updates**: Live data synchronization
- **Responsive Design**: Mobile-friendly interface
- **Search & Filter**: Advanced data filtering capabilities
- **Emergency Alerts**: Critical blood shortage notifications
- **Quick Actions**: Fast access to common operations
- **Data Visualization**: Charts and analytics

## 🛠 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with gradients and animations
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization
- **Font Awesome** - Icons
- **Google Fonts** - Typography

### Security & Performance
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API request throttling
- **Input Validation** - Data sanitization
- **JWT Authentication** - Secure token-based auth

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or Atlas cloud)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd lifeflow-blood-bank
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/lifeflow_blood_bank
JWT_SECRET=your-super-secret-jwt-key-here
CLIENT_URL=http://localhost:3000
```

### 4. Start MongoDB
**Option A: Local MongoDB**
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud)**
- Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
- Get connection string and update `MONGODB_URI` in `.env`

### 5. Start the Application
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

### 6. Access the Application
Open your browser and navigate to: `http://localhost:3000`

## 👥 User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration
- All donor and request operations

### Staff
- Donor management
- Request processing
- Inventory monitoring
- Profile management

### Donor
- View personal donation history
- Update profile information
- Submit donation requests

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Donors
- `GET /api/donors` - Get all donors
- `POST /api/donors` - Create new donor
- `PUT /api/donors/:id` - Update donor
- `DELETE /api/donors/:id` - Delete donor

### Requests
- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request

### Inventory
- `GET /api/inventory` - Get inventory data
- `POST /api/inventory` - Add inventory

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🎨 UI/UX Features

### Design Highlights
- **Modern Glassmorphism**: Backdrop blur effects
- **Gradient Backgrounds**: Dynamic color schemes
- **Smooth Animations**: CSS transitions and transforms
- **Blood-themed Icons**: Medical and healthcare focused
- **Responsive Grid Layouts**: Flexible component arrangement

### Interactive Elements
- **Modal Dialogs**: Clean form interfaces
- **Notification System**: Success/error feedback
- **Loading States**: User feedback during operations
- **Hover Effects**: Enhanced interactivity
- **Mobile Navigation**: Collapsible sidebar

## 🔧 Development

### Project Structure
```
lifeflow-blood-bank/
├── models/                 # MongoDB schemas
│   ├── User.js
│   ├── Donor.js
│   ├── BloodInventory.js
│   ├── Request.js
│   └── Campaign.js
├── routes/                 # API endpoints
│   ├── auth.js
│   ├── donors.js
│   ├── requests.js
│   ├── inventory.js
│   ├── campaigns.js
│   ├── reports.js
│   └── dashboard.js
├── HTML Components/        # Frontend components
│   ├── dashboard.html
│   ├── donors.html
│   ├── requests.html
│   ├── inventory.html
│   ├── profile.html
│   ├── settings.html
│   └── campaigns.html
├── styles/                 # CSS stylesheets
│   ├── main.css
│   ├── components.css
│   └── utilities.css
├── js/                     # JavaScript files
│   └── app.js
├── server.js               # Main server file
├── package.json            # Dependencies
├── .env                    # Environment variables
└── README.md              # Documentation
```

### Key Files
- `server.js` - Express server setup and middleware
- `js/app.js` - Frontend JavaScript functionality
- `models/` - Database schemas and models
- `routes/` - API route handlers
- `HTML Components/` - Dynamic page components

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Dashboard data loading
- [ ] Donor CRUD operations
- [ ] Request management
- [ ] Inventory tracking
- [ ] Settings persistence
- [ ] Mobile responsiveness
- [ ] Error handling

### Demo Credentials
```
Admin: admin@lifeflow.com / admin123
Staff: staff@lifeflow.com / staff123
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production` in `.env`
2. Configure production MongoDB URI
3. Set up reverse proxy (nginx recommended)
4. Enable SSL/TLS certificates

### Build Process
```bash
# Install dependencies
npm ci --production

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Blood donation awareness and healthcare professionals
- Open source community for amazing tools and libraries
- Medical institutions for domain expertise

## 📞 Support

For support, email support@lifeflow.com or create an issue in the repository.

---

**LifeFlow Blood Bank Management System** - Saving lives through efficient blood management. 🩸❤️
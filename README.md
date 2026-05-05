# Arm Academy - Learning Platform

**Arm Academy** is a Udemy-style learning platform built specifically for Armenian-speaking learners and educators. It connects students with tutors, teachers, and knowledge experts to facilitate various forms of learning including live classes, pre-recorded courses, chat-based lessons, and in-person meetups.

## 🎯 Key Features

- **User Roles**: Students, Tutors, Teachers, and Admins
- **Multiple Learning Formats**:
  - Live interactive classes with video streaming
  - Pre-recorded video courses
  - Chat-based learning sessions
  - In-person group classes
- **Class Recording**: All classes are automatically recorded for future reference
- **Community Groups**: Create and manage study groups and learning communities
- **Direct Messaging**: One-on-one communication between users
- **Progress Tracking**: Monitor student progress and completion
- **Ratings & Reviews**: Community-driven quality assurance
- **Certificates**: Issue completion certificates for courses
- **Attendance Tracking**: Record and monitor class attendance
- **Armenian Language Support**: Full Armenian language interface and content

## 🛠️ Tech Stack

- **Backend**: Django 4.2+, Django REST Framework
- **Database**: PostgreSQL (Production), SQLite (Development)
- **Video Storage**: AWS S3 + CloudFront (Production)
- **Caching**: Redis
- **Infrastructure**: Terraform (IaC)
- **Authentication**: Token-based + Session authentication
- **Video Streaming**: HLS streaming support
- **Real-time Communication**: WebSocket-ready architecture

## 📦 Project Structure

```
Arm-Academy/
├── config/                 # Django project settings
│   ├── settings.py        # Main settings
│   ├── urls.py           # URL routing
│   ├── wsgi.py           # WSGI configuration
│   └── asgi.py           # ASGI configuration (WebSocket support)
├── apps/                  # Django applications
│   ├── users/            # User authentication & profiles
│   ├── courses/          # Courses and classes
│   ├── groups/           # Community groups
│   ├── messaging/        # Direct & group chat
│   ├── videos/           # Video handling & streaming
│   └── ratings/          # Reviews, ratings, progress & certificates
├── templates/             # HTML templates
├── static/               # Static files (CSS, JS, images)
├── terraform/            # Infrastructure as Code
├── manage.py             # Django CLI
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)
- Virtual environment (recommended)
- Git

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Arm-Academy
   ```

2. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Apply database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (admin account)**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Load initial data (optional)**:
   ```bash
   python manage.py loaddata initial_data.json
   ```

8. **Start the development server**:
   ```bash
   python manage.py runserver
   ```

The application will be available at:
- **Application**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/

## 📚 Core Models & APIs

### Users (`apps/users/`)
- `CustomUser` - Extended user model with roles (student, tutor, teacher, admin)
- Authentication via tokens or sessions
- User profiles with expertise areas, ratings, and verification status

### Courses (`apps/courses/`)
- `Course` - Subject/course creation by tutors
- `Class` - Individual sessions (live, recorded, chat, in-person)
- Support for scheduling, enrollment, and recordings

### Groups (`apps/groups/`)
- `Group` - Community learning groups
- `GroupMembership` - Manage group members with roles

### Messaging (`apps/messaging/`)
- `Message` - Direct user-to-user messaging
- `GroupMessage` - Group chat functionality
- `ClassChat` - Real-time chat during class sessions

### Videos (`apps/videos/`)
- `Video` - Video file management and streaming
- `Recording` - Automatic class recording handling

### Ratings (`apps/ratings/`)
- `Review` - Ratings for tutors and courses
- `Progress` - Track student course progress
- `Attendance` - Class attendance records
- `Certificate` - Course completion certificates

## 🔐 Authentication

The platform uses:
- **Token Authentication**: For API clients
- **Session Authentication**: For web interface
- **Custom User Model**: Extended Django user with roles

Example authentication:
```bash
# Get token
POST /api/auth/login/
{
  "username": "user@example.com",
  "password": "password"
}

# Use token in requests
Authorization: Token <your-token>
```

## 📊 Admin Interface

Access the Django admin at http://localhost:8000/admin using your superuser credentials.

Manage:
- Users and roles
- Courses and classes
- Groups and membership
- Video uploads and recording
- Reviews and ratings
- Student progress and attendance
- Certificates

## 🚀 Deployment

### Using Terraform (AWS Free Tier)

The project includes Terraform configuration for AWS deployment:

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -var-file="production.tfvars"

# Apply configuration
terraform apply -var-file="production.tfvars"
```

This sets up:
- EC2 instance (t2.micro) for Django
- RDS PostgreSQL database
- S3 bucket for video storage
- CloudFront CDN distribution

### Environment Setup for Production

```bash
# Copy and update environment variables
cp .env.example .env
# Edit .env for production settings:
# - DEBUG=False
# - SECRET_KEY=<generate-new-key>
# - ALLOWED_HOSTS=yourdomain.com
# - DATABASE_URL=postgresql://user:pass@host/db
```

## 📝 Available Commands

```bash
# Development
python manage.py runserver              # Start dev server
python manage.py migrate               # Apply migrations
python manage.py makemigrations        # Create new migrations
python manage.py createsuperuser       # Create admin user

# Database
python manage.py dbshell               # Open database shell
python manage.py dumpdata > backup.json # Backup data
python manage.py loaddata backup.json  # Restore data

# Static files
python manage.py collectstatic         # Collect static files

# Testing
python manage.py test                  # Run tests
```

## 🔗 API Documentation

### User Endpoints
- `GET/POST /api/users/` - List/Create users
- `GET/PUT /api/users/<id>/` - Retrieve/Update user
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/profile/` - Current user profile

### Course Endpoints
- `GET/POST /api/courses/` - List/Create courses
- `GET/PUT /api/courses/<id>/` - Retrieve/Update course
- `GET/POST /api/courses/<id>/classes/` - Manage classes
- `POST /api/courses/<id>/enroll/` - Enroll in course

### Group Endpoints
- `GET/POST /api/groups/` - List/Create groups
- `GET/PUT /api/groups/<id>/` - Retrieve/Update group
- `POST /api/groups/<id>/join/` - Join group
- `GET/POST /api/groups/<id>/messages/` - Group chat

### Video Endpoints
- `GET/POST /api/videos/` - List/Upload videos
- `GET /api/videos/<id>/` - Get video details
- `POST /api/videos/<id>/play/` - Stream video

### Rating Endpoints
- `GET/POST /api/reviews/` - Create/View reviews
- `GET /api/progress/<id>/` - View course progress
- `GET /api/certificates/` - View certificates

## 🌍 Internationalization

The platform is Armenian-first with the following considerations:
- All course content, descriptions, and user content defaults to Armenian
- The admin interface supports Armenian
- RTL layout support for Armenian text (when using frontend framework)

## 📧 Support & Documentation

- **Django Docs**: https://docs.djangoproject.com/
- **Django REST Framework**: https://www.django-rest-framework.org/
- **Project Issues**: [GitHub Issues](link)
- **Contributing**: See CONTRIBUTING.md

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Contact

For questions or support:
- Email: support@armacademy.am
- Website: https://www.armacademy.am
- GitHub: [@arm-academy](https://github.com/arm-academy)

---

Made with ❤️ for the Armenian learning community

# Arm Academy - Django Learning Platform

This is a Django-based learning platform that connects Armenian students with tutors, teachers, and knowledge experts. The platform supports multiple learning formats: live classes, pre-recorded courses, chat-based lessons, and in-person meetups.

## Tech Stack

- **Backend**: Python 3.8+, Django 4.2+, Django REST Framework
- **Database**: PostgreSQL (production), SQLite (development)
- **Video Storage**: AWS S3 + CloudFront (for paid features)
- **Caching**: Redis (optional, for real-time features)
- **Infrastructure**: Terraform (IaC for AWS)

## Project Features

### Core Features
- User authentication with roles (Student, Tutor, Teacher, Admin)
- Course creation and management by tutors
- Multiple class formats: live, recorded, chat-based, in-person
- Automatic class recording
- Community groups and study groups
- Direct messaging and group chat
- Video management and streaming
- Progress tracking for students
- Reviews and ratings system
- Attendance tracking
- Course completion certificates

### Languages
- Primary language: Armenian
- Admin interface: English + Armenian support

## Project Structure

```
Arm-Academy/
├── config/              # Django settings and URLs
├── apps/
│   ├── users/          # User authentication and profiles
│   ├── courses/        # Courses and class management
│   ├── groups/         # Community groups
│   ├── messaging/      # Direct messages and chat
│   ├── videos/         # Video handling
│   └── ratings/        # Reviews, progress, and certificates
├── terraform/          # Infrastructure as Code (AWS)
├── templates/          # HTML templates
├── static/             # Static files
├── manage.py           # Django CLI
├── requirements.txt    # Python dependencies
└── .env.example        # Environment variables
```

## Database Models

### Users App
- `CustomUser` - Extended user with roles and ratings

### Courses App
- `Course` - Course/subject created by tutors
- `Class` - Individual class sessions (live, recorded, chat, in-person)

### Groups App
- `Group` - Study/class/community groups
- `GroupMembership` - Track members and roles

### Messaging App
- `Message` - Direct user-to-user messages
- `GroupMessage` - Group chat messages
- `ClassChat` - Real-time chat during classes

### Videos App
- `Video` - Video file management
- `Recording` - Automatic class recordings

### Ratings App
- `Review` - Ratings for tutors and courses
- `Progress` - Student progress tracking
- `Attendance` - Class attendance records
- `Certificate` - Completion certificates

## Getting Started

### Prerequisites
- Python 3.8+
- pip or poetry
- Virtual environment (venv)

### Setup Instructions

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

5. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server:**
   ```bash
   python manage.py runserver
   ```

Access the application at:
- **Web App**: http://localhost:8000
- **Admin**: http://localhost:8000/admin
- **API**: http://localhost:8000/api/

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/profile/` - Current user profile

### Users
- `GET/POST /api/users/` - List/create users
- `GET/PUT /api/users/<id>/` - Get/update user
- `GET /api/users/<id>/courses/` - User's courses
- `GET /api/users/<id>/reviews/` - User's reviews

### Courses
- `GET/POST /api/courses/` - List/create courses
- `GET/PUT /api/courses/<id>/` - Get/update course
- `GET /api/courses/<id>/classes/` - Course classes
- `POST /api/courses/<id>/enroll/` - Enroll in course
- `GET /api/courses/<id>/reviews/` - Course reviews

### Classes
- `GET/POST /api/classes/` - List/create classes
- `GET/PUT /api/classes/<id>/` - Get/update class
- `POST /api/classes/<id>/attendance/` - Mark attendance
- `GET /api/classes/<id>/chat/` - Class chat messages
- `POST /api/classes/<id>/chat/` - Post chat message

### Groups
- `GET/POST /api/groups/` - List/create groups
- `GET/PUT /api/groups/<id>/` - Get/update group
- `POST /api/groups/<id>/join/` - Join group
- `GET/POST /api/groups/<id>/messages/` - Group chat

### Messaging
- `GET/POST /api/messages/` - Get/send direct messages
- `GET /api/messages/<id>/` - Get conversation

### Videos
- `GET/POST /api/videos/` - List/upload videos
- `GET /api/videos/<id>/` - Get video details
- `POST /api/videos/<id>/upload/` - Upload video

### Reviews & Progress
- `GET/POST /api/reviews/` - List/create reviews
- `GET /api/progress/` - Get student progress
- `GET /api/certificates/` - Get certificates

## Deployment

### Using Terraform (AWS)

```bash
cd terraform

# Initialize
terraform init

# Plan
terraform plan -var-file="prod.tfvars"

# Deploy
terraform apply -var-file="prod.tfvars"
```

### Environment Variables for Production

```
DEBUG=False
SECRET_KEY=<generate-secure-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379/0
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_STORAGE_BUCKET_NAME=<bucket-name>
```

## Common Commands

```bash
# Development
python manage.py runserver
python manage.py migrate
python manage.py makemigrations

# Database
python manage.py dbshell
python manage.py dumpdata > backup.json
python manage.py loaddata backup.json

# Admin
python manage.py createsuperuser
python manage.py changepassword <username>

# Static files
python manage.py collectstatic

# Testing
python manage.py test
```

## Key Design Decisions

1. **Custom User Model**: Extended Django user with roles for flexible permission management
2. **Class-based Architecture**: Supports multiple class formats (live, recorded, chat, in-person)
3. **Automatic Recording**: All classes have recording capabilities for future access
4. **Subscription Model**: Free courses initially, paid features via Stripe integration later
5. **Community-Driven**: Groups and direct messaging enable peer-to-peer learning
6. **Armenian-First**: Primary language is Armenian with English fallback in admin

## Future Enhancements

- [ ] Real-time video streaming (WebRTC/HLS)
- [ ] Live chat with WebSockets
- [ ] Payment processing (Stripe integration)
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Advanced search and recommendations
- [ ] Analytics dashboard
- [ ] Certificate verification system
- [ ] Video quality adaptive streaming
- [ ] AI-powered course recommendations

## Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support & Documentation

For detailed information, see:
- README.md - Project overview and setup guide
- .env.example - Environment variables template
- terraform/ - Infrastructure configuration
- docs/ - Additional documentation (if available)

---

**Last Updated**: May 2026
**Version**: 1.0.0

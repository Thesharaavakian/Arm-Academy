# API Documentation

## Base URL
```
http://localhost:8000/api/
```

## Authentication

The API uses token-based authentication. Include the token in the Authorization header:

```
Authorization: Token <your-token>
```

Or use session authentication:
```
Cookie: sessionid=<session-id>
```

## Response Format

All responses are in JSON format with the following structure:

### Success Response
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  ...
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": {...}
}
```

## Pagination

List endpoints support pagination with query parameters:

```
GET /api/courses/?page=1&page_size=10
```

Response includes:
```json
{
  "count": 100,
  "next": "http://api.example.com/courses/?page=2",
  "previous": null,
  "results": [...]
}
```

## Filtering & Search

### Filter

```
GET /api/courses/?level=beginner&is_published=true
```

### Search

```
GET /api/courses/?search=python
```

### Ordering

```
GET /api/courses/?ordering=-created_at
```

## Endpoints

### Health Check

```
GET /health/
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Arm Academy API",
  "version": "1.0.0"
}
```

### Users

#### List Users
```
GET /api/users/
```

#### Get User Profile
```
GET /api/users/<id>/
GET /api/users/profile/  # Current user
```

#### Create User (Register)
```
POST /api/users/

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepass123",
  "password_confirm": "securepass123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student"
}
```

#### Get User's Courses
```
GET /api/users/<id>/courses/
```

#### Get User's Reviews
```
GET /api/users/<id>/reviews/
```

### Courses

#### List Courses
```
GET /api/courses/
```

**Query Parameters:**
- `level`: beginner, intermediate, advanced
- `is_published`: true, false
- `search`: Search by title, description
- `ordering`: created_at, total_students, average_rating

#### Create Course
```
POST /api/courses/

{
  "title": "Python Basics",
  "description": "Learn Python from scratch",
  "category": "Programming",
  "level": "beginner",
  "is_free": true,
  "cover_image": <file>
}
```

#### Get Course Details
```
GET /api/courses/<id>/
```

#### Get Course Classes
```
GET /api/courses/<id>/classes/
```

#### Enroll in Course
```
POST /api/courses/<id>/enroll/
```

#### Get Course Reviews
```
GET /api/courses/<id>/reviews/
```

### Classes

#### List Classes
```
GET /api/classes/
```

**Query Parameters:**
- `class_type`: live, recorded, chat, in_person
- `status`: scheduled, ongoing, completed, cancelled
- `course`: Filter by course ID

#### Get Class Details
```
GET /api/classes/<id>/
```

#### Mark Attendance
```
POST /api/classes/<id>/attendance/

{
  "status": "present"  // present, absent, late, excused
}
```

#### Get Class Chat
```
GET /api/classes/<id>/chat/
```

#### Post Chat Message
```
POST /api/classes/<id>/chat_post/

{
  "content": "Great explanation!"
}
```

### Groups

#### List Groups
```
GET /api/groups/
```

**Query Parameters:**
- `group_type`: study, class, community
- `is_private`: true, false
- `search`: Search by name

#### Create Group
```
POST /api/groups/

{
  "name": "Python Learners",
  "description": "A group for Python enthusiasts",
  "group_type": "study",
  "is_private": false
}
```

#### Get Group Details
```
GET /api/groups/<id>/
```

#### Join Group
```
POST /api/groups/<id>/join/
```

#### Leave Group
```
POST /api/groups/<id>/leave/
```

#### Get Group Messages
```
GET /api/groups/<id>/messages/
```

#### Post Group Message
```
POST /api/groups/<id>/messages/

{
  "content": "Hello everyone!"
}
```

### Messages

#### List Messages
```
GET /api/messages/
```

**Query Parameters:**
- `is_read`: true, false
- `sender`: Filter by sender ID

#### Send Message
```
POST /api/messages/

{
  "recipient": <user_id>,
  "content": "Hi there!"
}
```

#### Mark as Read
```
PATCH /api/messages/<id>/

{
  "is_read": true
}
```

### Videos

#### List Videos
```
GET /api/videos/
```

**Query Parameters:**
- `status`: uploading, processing, ready, failed
- `is_public`: true, false
- `search`: Search by title

#### Upload Video
```
POST /api/videos/

{
  "title": "Class Recording",
  "description": "Recording of live class",
  "video_file": <file>,
  "is_public": true
}
```

#### Get Video Details
```
GET /api/videos/<id>/
```

#### Increment View Count
```
POST /api/videos/<id>/increment_views/
```

### Reviews

#### List Reviews
```
GET /api/reviews/
```

**Query Parameters:**
- `rating`: 1-5
- `is_verified`: true, false

#### Create Review
```
POST /api/reviews/

{
  "tutor": <tutor_id>,  // or "course": <course_id>
  "rating": 5,
  "title": "Excellent instructor",
  "comment": "Very knowledgeable and patient",
  "is_verified": true
}
```

#### Mark Helpful
```
POST /api/reviews/<id>/mark_helpful/
```

### Progress

#### Get Student Progress
```
GET /api/progress/
GET /api/progress/<id>/
```

### Attendance

#### List Attendance
```
GET /api/attendance/
```

#### Record Attendance
```
POST /api/attendance/

{
  "student": <student_id>,
  "class_session": <class_id>,
  "status": "present"
}
```

### Certificates

#### List Certificates
```
GET /api/certificates/
```

#### Get Certificate Details
```
GET /api/certificates/<id>/
```

## Status Codes

- `200` OK - Successful request
- `201` Created - Resource created
- `204` No Content - Successful request with no content
- `400` Bad Request - Invalid request
- `401` Unauthorized - Authentication required
- `403` Forbidden - Permission denied
- `404` Not Found - Resource not found
- `500` Server Error - Internal server error

## Rate Limiting

Currently not implemented. Will be added in future versions.

## Versioning

API version is included in headers: `X-API-Version: 1.0.0`

---

For more details, check the [README](README.md).

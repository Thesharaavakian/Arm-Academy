# Contributing to Arm Academy

Thank you for your interest in contributing to Arm Academy! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Help others learn and grow
- Respect diversity and different opinions

## Getting Started

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/Arm-Academy.git
   cd Arm-Academy
   ```

3. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file from `.env.example`

6. Run migrations:
   ```bash
   python manage.py migrate
   ```

## Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `refactor/` for code refactoring

### Writing Code

- Follow PEP 8 style guide
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions small and focused
- Write tests for new features

### Writing Tests

Create tests in the same app directory as the code being tested:

```python
# apps/users/tests.py
from django.test import TestCase
from .models import CustomUser

class CustomUserTestCase(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='student'
        )
    
    def test_user_creation(self):
        self.assertEqual(self.user.role, 'student')
        self.assertTrue(self.user.is_student)
```

Run tests:
```bash
python manage.py test
# or with pytest
pytest
```

### Committing Changes

Write clear, descriptive commit messages:

```
[FEATURE] Add user registration endpoint

- Create registration serializer
- Add user registration viewset
- Include email validation
- Add tests for registration

Closes #123
```

Use conventional commit format:
- `[FEATURE]` - New feature
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code refactoring
- `[DOCS]` - Documentation changes
- `[TEST]` - Testing changes

## API Endpoint Conventions

When adding new API endpoints:

- Use RESTful naming conventions
- Document endpoints in docstrings
- Include proper error handling
- Return appropriate HTTP status codes
- Add permission classes
- Support filtering and search

Example:
```python
class CourseViewSet(viewsets.ModelViewSet):
    """
    API endpoint for courses.
    
    List courses, create new course, retrieve, update, or delete.
    """
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ['level', 'is_published']
    search_fields = ['title', 'description']
```

## Database Schema Changes

1. Create migrations for model changes:
   ```bash
   python manage.py makemigrations
   ```

2. Review migration files before committing

3. Test migrations:
   ```bash
   python manage.py migrate
   python manage.py migrate --fake  # for testing rollback
   ```

## Documentation

- Update README.md for major changes
- Document new models in appropriate docstrings
- Include examples for complex features
- Update API documentation

## Pull Request Process

1. Push your branch to your fork
2. Create a Pull Request to the main repository
3. Fill out the PR template completely
4. Link related issues
5. Request review from maintainers

### PR Checklist

- [ ] Code follows PEP 8 style guide
- [ ] Tests are added/updated
- [ ] Documentation is updated
- [ ] Commit messages are descriptive
- [ ] No breaking changes without discussion
- [ ] Database migrations are included (if needed)

## Reporting Issues

### Bug Reports

Include:
- Django/Python version
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Error messages/traceback
- Screenshots (if applicable)

### Feature Requests

Include:
- Clear description of the feature
- Use cases and benefits
- Possible implementation approach
- Any relevant mockups or examples

## Code Review Process

Maintainers will review PRs within 5-7 days. Please:
- Be open to feedback
- Respond to comments
- Make requested changes
- Re-request review after updates

## Questions?

- Open a GitHub discussion
- Ask in the community forum
- Email: dev@armacademy.am

---

Thank you for contributing to Arm Academy! 🎉

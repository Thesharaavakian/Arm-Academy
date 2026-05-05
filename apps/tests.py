from django.test import TestCase
from apps.users.models import CustomUser
from apps.courses.models import Course, Class


class CustomUserTestCase(TestCase):
    """Test cases for CustomUser model"""
    
    def setUp(self):
        """Create test user"""
        self.user = CustomUser.objects.create_user(
            username='testtutor',
            email='tutor@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Tutor',
            role='tutor'
        )
    
    def test_user_creation(self):
        """Test user creation"""
        self.assertEqual(self.user.username, 'testtutor')
        self.assertEqual(self.user.role, 'tutor')
        self.assertTrue(self.user.is_tutor)
    
    def test_user_password(self):
        """Test password is hashed"""
        self.assertTrue(self.user.check_password('testpass123'))
        self.assertFalse(self.user.check_password('wrongpassword'))
    
    def test_user_str(self):
        """Test user string representation"""
        expected = 'Test Tutor (tutor)'
        self.assertEqual(str(self.user), expected)


class CourseTestCase(TestCase):
    """Test cases for Course model"""
    
    def setUp(self):
        """Create test course"""
        self.tutor = CustomUser.objects.create_user(
            username='testtutor',
            email='tutor@example.com',
            password='testpass123',
            role='tutor'
        )
        
        self.course = Course.objects.create(
            title='Test Course',
            description='Test course description',
            tutor=self.tutor,
            category='Mathematics',
            level='beginner',
            is_free=True
        )
    
    def test_course_creation(self):
        """Test course creation"""
        self.assertEqual(self.course.title, 'Test Course')
        self.assertEqual(self.course.tutor, self.tutor)
        self.assertTrue(self.course.is_free)
    
    def test_course_str(self):
        """Test course string representation"""
        self.assertEqual(str(self.course), 'Test Course')


class ClassTestCase(TestCase):
    """Test cases for Class model"""
    
    def setUp(self):
        """Create test class"""
        from django.utils import timezone
        from datetime import timedelta
        
        self.tutor = CustomUser.objects.create_user(
            username='testtutor',
            email='tutor@example.com',
            password='testpass123',
            role='tutor'
        )
        
        self.course = Course.objects.create(
            title='Test Course',
            description='Test course',
            tutor=self.tutor,
            category='Mathematics'
        )
        
        now = timezone.now()
        self.class_session = Class.objects.create(
            course=self.course,
            title='Test Class',
            class_type='live',
            scheduled_start=now + timedelta(hours=1),
            scheduled_end=now + timedelta(hours=2),
            duration_minutes=60
        )
    
    def test_class_creation(self):
        """Test class creation"""
        self.assertEqual(self.class_session.title, 'Test Class')
        self.assertEqual(self.class_session.course, self.course)
        self.assertEqual(self.class_session.class_type, 'live')
    
    def test_class_is_not_live(self):
        """Test class is_live_now method"""
        self.assertFalse(self.class_session.is_live_now())

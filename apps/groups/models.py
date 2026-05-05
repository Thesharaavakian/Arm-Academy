from django.db import models
from apps.users.models import CustomUser


class Group(models.Model):
    """
    Group model for organizing students and tutors
    """
    TYPE_CHOICES = [
        ('study', 'Study Group'),
        ('class', 'Class Group'),
        ('community', 'Community'),
    ]
    
    name = models.CharField(max_length=255, help_text='Group name in Armenian')
    description = models.TextField(blank=True, null=True)
    
    group_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='study')
    creator = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='created_groups')
    
    # Members
    members = models.ManyToManyField(CustomUser, related_name='learning_groups')
    member_count = models.IntegerField(default=1)
    
    # Image
    cover_image = models.ImageField(upload_to='group_covers/', null=True, blank=True)
    
    # Settings
    is_private = models.BooleanField(default=False)
    require_approval = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name


class GroupMembership(models.Model):
    """
    Track membership status and roles
    """
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
    ]
    
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    
    # Status
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('group', 'user')
    
    def __str__(self):
        return f"{self.user.username} in {self.group.name}"

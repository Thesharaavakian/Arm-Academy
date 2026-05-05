from django.db import models
from apps.users.models import CustomUser
from apps.courses.models import Class
from apps.groups.models import Group


class Message(models.Model):
    """
    Direct message between users
    """
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.sender.username} -> {self.recipient.username}"


class GroupMessage(models.Model):
    """
    Group chat message
    """
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='group_messages')
    content = models.TextField()
    
    # Reactions/Engagement
    reaction_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.sender.username} in {self.group.name}"


class ClassChat(models.Model):
    """
    Chat messages during a class session
    """
    class_session = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='chat_messages')
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    content = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Chat in {self.class_session.title}"

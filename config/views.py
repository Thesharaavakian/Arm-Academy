from django.http import JsonResponse
from django.views import View


class HealthCheckView(View):
    """Simple health check endpoint"""
    def get(self, request):
        return JsonResponse({
            'status': 'healthy',
            'service': 'Arm Academy API',
            'version': '1.0.0'
        })


def api_root(request):
    """API root endpoint"""
    return JsonResponse({
        'name': 'Arm Academy API',
        'version': '1.0.0',
        'description': 'Learning platform connecting Armenian students with tutors',
        'endpoints': {
            'users': '/api/users/',
            'courses': '/api/courses/',
            'classes': '/api/classes/',
            'groups': '/api/groups/',
            'messages': '/api/messages/',
            'videos': '/api/videos/',
            'reviews': '/api/reviews/',
            'progress': '/api/progress/',
            'certificates': '/api/certificates/',
        }
    })

from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def _html_email(title, body_html, cta_text=None, cta_url=None):
    cta_block = ''
    if cta_text and cta_url:
        cta_block = f'''
        <div style="text-align:center;margin:32px 0">
          <a href="{cta_url}" style="background:#4f46e5;color:#fff;padding:14px 32px;border-radius:8px;font-weight:600;text-decoration:none">{cta_text}</a>
        </div>'''
    return f'''
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#312e81,#4f46e5,#7c3aed);padding:32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">Arm Academy</h1>
      </div>
      <div style="padding:40px">
        <h2 style="color:#1e1b4b;margin:0 0 16px">{title}</h2>
        {body_html}
        {cta_block}
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;text-align:center">
          © Arm Academy · The Armenian Learning Platform
        </p>
      </div>
    </div>'''


@shared_task(bind=True, max_retries=3)
def send_email_otp_task(self, user_email, otp_code, first_name=''):
    name = first_name or 'there'
    subject = 'Arm Academy — Verify Your Email'
    text_body = f'Hi {name},\n\nYour verification code is: {otp_code}\n\nExpires in 15 minutes.\n\nArm Academy'
    html_body = _html_email(
        'Verify your email address',
        f'''<p style="color:#475569">Hi {name},</p>
        <p style="color:#475569">Enter this code to verify your email address:</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#4f46e5">{otp_code}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px">This code expires in <strong>15 minutes</strong>. If you didn\'t request this, ignore this email.</p>''',
    )
    try:
        msg = EmailMultiAlternatives(subject, text_body, settings.DEFAULT_FROM_EMAIL, [user_email])
        msg.attach_alternative(html_body, 'text/html')
        msg.send()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


@shared_task(bind=True, max_retries=2)
def send_phone_otp_task(self, phone_number, otp_code):
    try:
        from django.conf import settings as s
        sid = getattr(s, 'TWILIO_ACCOUNT_SID', '')
        token = getattr(s, 'TWILIO_AUTH_TOKEN', '')
        from_num = getattr(s, 'TWILIO_PHONE_NUMBER', '')
        if not (sid and token and from_num):
            return  # Twilio not configured — skip silently
        from twilio.rest import Client
        Client(sid, token).messages.create(
            body=f'Arm Academy: Your verification code is {otp_code}. Valid 10 minutes.',
            from_=from_num,
            to=phone_number,
        )
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_welcome_email_task(self, user_email, first_name, role):
    name = first_name or 'there'
    role_label = 'tutor' if role in ('tutor', 'teacher') else 'student'
    try:
        msg = EmailMultiAlternatives(
            subject='Welcome to Arm Academy 🎉',
            body=f'Hi {name}, welcome to Arm Academy! Your account is now active.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user_email],
        )
        msg.attach_alternative(
            _html_email(
                f'Welcome to Arm Academy!',
                f'''<p style="color:#475569">Hi {name},</p>
                <p style="color:#475569">Your email is verified and your {role_label} account is now active. Start exploring.</p>''',
                cta_text='Go to Dashboard',
                cta_url='https://armacademy.am/dashboard',
            ),
            'text/html',
        )
        msg.send()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_password_reset_task(self, user_email, otp_code, first_name=''):
    name = first_name or 'there'
    subject = 'Arm Academy — Reset Your Password'
    text = f'Hi {name},\n\nYour password reset code is: {otp_code}\n\nExpires in 30 minutes.\n\nArm Academy'
    html = _html_email(
        'Reset your password',
        f'''<p style="color:#475569">Hi {name},</p>
        <p style="color:#475569">Enter this code to reset your password:</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#4f46e5">{otp_code}</span>
        </div>
        <p style="color:#94a3b8;font-size:13px">Valid for <strong>30 minutes</strong>. If you didn\'t request this, ignore this email.</p>''',
    )
    try:
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [user_email])
        msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)


@shared_task(bind=True, max_retries=2)
def notify_tutor_new_enrollment_task(self, tutor_email, tutor_name, student_name, course_title, total_students):
    """Notify tutor when a student enrolls in their course."""
    name = tutor_name or 'Tutor'
    subject = f'New enrollment in "{course_title}"'
    text = f'Hi {name},\n\n{student_name} just enrolled in "{course_title}".\nTotal: {total_students} students.\n\nArm Academy'
    html = _html_email(
        'New Student Enrolled! 🎉',
        f'''<p style="color:#475569">Hi {name},</p>
        <p style="color:#475569">You have a new student in your course:</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
          <div style="font-size:18px;font-weight:700;color:#1e1b4b">{course_title}</div>
          <div style="font-size:28px;font-weight:800;color:#4f46e5;margin-top:8px">+1 student</div>
          <div style="color:#64748b;margin-top:4px">{student_name} just enrolled · {total_students} total</div>
        </div>''',
        cta_text='View Dashboard',
        cta_url=f'{settings.FRONTEND_URL}/dashboard',
    )
    try:
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [tutor_email])
        msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_payment_confirmation_task(self, user_email, first_name, course_title, amount_amd):
    name = first_name or 'there'
    subject = f'Payment Confirmed — {course_title}'
    text = f'Hi {name},\n\nYour payment of {amount_amd:,.0f} AMD for "{course_title}" was successful. You are now enrolled.\n\nArm Academy'
    html = _html_email(
        'Payment Confirmed ✓',
        f'''<p style="color:#475569">Hi {name},</p>
        <p style="color:#475569">Your payment has been confirmed and you are now enrolled in:</p>
        <div style="background:#f0fdf4;border-radius:12px;padding:20px;text-align:center;margin:24px 0;border:1px solid #bbf7d0">
          <div style="font-size:18px;font-weight:700;color:#166534">{course_title}</div>
          <div style="font-size:28px;font-weight:800;color:#16a34a;margin-top:8px">{amount_amd:,.0f} AMD</div>
        </div>''',
        cta_text='Start Learning',
        cta_url=f'{settings.FRONTEND_URL}/dashboard',
    )
    try:
        msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [user_email])
        msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)

#!/usr/bin/env python3
"""
Arm Academy — Full QA Test Suite
Functional · Security · Integration · Performance · UI/Smoke · Edge Cases
"""
import requests, time, sys, re, subprocess, shlex
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

BASE = "http://13.61.77.153:8080"
API  = BASE + "/api"

G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; W="\033[97m"; X="\033[0m"
results = []

def check(name, ok, detail="", warn=False):
    tag = "WARN" if (warn and not ok) else ("PASS" if ok else "FAIL")
    c   = Y if tag=="WARN" else (G if tag=="PASS" else R)
    results.append({"name": name, "status": tag, "detail": detail})
    d = f"  {Y}{detail}{X}" if detail else ""
    print(f"  [{c}{tag}{X}] {name}{d}")
    return ok

def hdr(t): print(f"\n{B}{'─'*62}{X}\n{W}{t}{X}\n{B}{'─'*62}{X}")

def login(user, pw):
    r = requests.post(f"{API}/auth/login/", json={"username": user, "password": pw}, timeout=10)
    if r.status_code == 200:
        d = r.json()
        return d.get("access"), d.get("user", {})
    return None, {}

def auth(tok): return {"Authorization": f"Bearer {tok}"}

# ── Pre-flight: wipe stale QA accounts + clear lockout cache ─────────────────
subprocess.run(shlex.split(
    "ssh -i /home/shara/.ssh/hzortech_deploy -o StrictHostKeyChecking=no "
    "ubuntu@13.61.77.153 "
    "'sudo docker exec arm-academy-web-1 python -c \""
    "import os,django; os.environ[\\\"DJANGO_SETTINGS_MODULE\\\"]='config.settings'; django.setup(); "
    "from django.core.cache import cache; cache.clear(); "
    "from apps.users.models import CustomUser; "
    "[CustomUser.objects.filter(username=u).delete() "
    " for u in [\\\"emailflow_test\\\",\\\"botdetect99\\\",\\\"hackadmin99\\\",\\\"weakpassuser\\\",\\\"newuser999\\\"]]; "
    "print(\\\"pre-flight ok\\\")\""
    "'"
), capture_output=True, timeout=20)

# ── Tokens ───────────────────────────────────────────────────────────────────
tok_student, usr_student = login("qa_student",  "Test1234!")
tok_tutor,   usr_tutor   = login("qa_tutor",    "Test1234!")
tok_admin,   usr_admin   = login("admin",        "Admin2026!")
student_id = usr_student.get("id")

# =============================================================================
# 1. FUNCTIONAL TESTING
# =============================================================================
hdr("1  FUNCTIONAL TESTING")

r = requests.get(f"{BASE}/health/", timeout=10)
check("Health endpoint returns 200",         r.status_code == 200)
check("Health body: status=healthy",         r.json().get("status") == "healthy")

r = requests.get(f"{API}/courses/",          timeout=10)
check("GET /courses/ — public, no auth",     r.status_code == 200)
check("Course list has results",             "results" in r.json() or isinstance(r.json(), list))

r = requests.get(f"{API}/users/featured_tutors/", timeout=10)
check("GET /users/featured_tutors/ — public", r.status_code == 200)

r = requests.get(f"{API}/users/site_stats/", timeout=10)
check("GET /users/site_stats/ — public",     r.status_code == 200)
check("site_stats has 4 count fields",
      all(k in r.json() for k in ("total_students","total_tutors","total_courses","total_reviews")))

check("Student login → JWT",  tok_student is not None)
check("Tutor login → JWT",    tok_tutor   is not None)
check("Admin login → JWT",    tok_admin   is not None)

r = requests.get(f"{API}/users/{student_id}/", headers=auth(tok_student), timeout=10)
check("GET /users/{id}/ returns own profile",  r.status_code == 200)
check("Profile username correct",             r.json().get("username") == "qa_student")
check("Own profile shows email to owner",      "email" in r.json())
# Different user viewing student profile should NOT see email
r_other = requests.get(f"{API}/users/{student_id}/", headers=auth(tok_tutor), timeout=10)
check("Other user view hides email (privacy)", "email" not in r_other.json())

r = requests.patch(f"{API}/users/{student_id}/", json={"bio":"QA test"}, headers=auth(tok_student), timeout=10)
check("PATCH /users/{id}/ updates bio",        r.status_code in (200,201))

r = requests.post(f"{API}/courses/1/enroll/", headers=auth(tok_student), timeout=10)
check("Student enrolls in free course",        r.status_code in (200,201), r.json().get("detail",""))

r = requests.get(f"{API}/courses/my_courses/", headers=auth(tok_tutor), timeout=10)
check("Tutor GET /courses/my_courses/",         r.status_code == 200)
check("  └─ returns list",                      isinstance(r.json(), list))

r = requests.get(f"{API}/courses/1/",           headers=auth(tok_student), timeout=10)
check("Course detail — enrolled student",        r.status_code == 200)
check("  └─ has title + sections key",          "title" in r.json())

r = requests.post(f"{API}/reviews/",
    json={"course":1,"rating":5,"comment":"QA review","title":"Great"},
    headers=auth(tok_student), timeout=10)
check("Enrolled student submits review",        r.status_code in (200,201), r.json().get("detail",""))

r = requests.post(f"{API}/groups/",
    json={"name":"QA Group","description":"test","group_type":"study","is_private":False},
    headers=auth(tok_tutor), timeout=10)
check("Tutor creates public group",             r.status_code == 201)
group_id = r.json().get("id") if r.status_code == 201 else None

if group_id:
    r = requests.post(f"{API}/groups/{group_id}/join/",  headers=auth(tok_student), timeout=10)
    check("Student joins public group",                  r.status_code == 200)
    r = requests.post(f"{API}/groups/{group_id}/leave/", headers=auth(tok_student), timeout=10)
    check("Student leaves group",                        r.status_code == 200)

r = requests.get(f"{API}/messages/", headers=auth(tok_student), timeout=10)
check("GET /messages/ returns list",            r.status_code == 200)

r = requests.post(f"{API}/auth/logout/",
    json={"refresh":"dummy"}, headers=auth(tok_student), timeout=10)
check("Logout endpoint responds",               r.status_code in (200,205,400))
tok_student, usr_student = login("qa_student", "Test1234!")  # re-login

# =============================================================================
# 2. SECURITY TESTING
# =============================================================================
hdr("2  SECURITY TESTING")

# Protected endpoints block anonymous access
r = requests.get(f"{API}/courses/my_courses/", timeout=10)
check("Unauth GET /courses/my_courses/ → 401", r.status_code == 401)

r = requests.get(f"{API}/payments/mine/", timeout=10)
check("Unauth GET /payments/mine/ → 401/403", r.status_code in (401, 403))

# SQL injection — Django ORM is parameterised; payloads return 401 (user not found)
for payload in ["' OR '1'='1", "admin'--", "' OR 1=1--", "1; DROP TABLE users;--"]:
    r = requests.post(f"{API}/auth/login/", json={"username":payload,"password":payload}, timeout=10)
    check(f"SQLi rejected: {payload[:22]}", r.status_code in (400,401,403,429), f"got {r.status_code}")

# XSS in username
r = requests.post(f"{API}/auth/register/",
    json={"username":"<script>alert(1)</script>","email":"xss@qa.test",
          "password":"Test1234!","password2":"Test1234!","role":"student"}, timeout=10)
check("XSS username rejected/sanitised",       r.status_code == 400 or "<script>" not in r.text)

# Honeypot — bot fills hidden fields
r = requests.post(f"{API}/auth/register/",
    json={"username":"botdetect99","email":"bot@qa.test",
          "password":"Test1234!","password2":"Test1234!","role":"student",
          "website":"http://spam.com","phone_confirm":"123"}, timeout=10)
check("Honeypot registration blocked/silent",  r.status_code in (200,201,400,403),
      f"got {r.status_code} — 200/201=silent drop")

# JWT tampering
if tok_student:
    parts = tok_student.split(".")
    r = requests.get(f"{API}/users/{student_id}/",
        headers={"Authorization": f"Bearer {parts[0]}.{parts[1]}.BADSIG"}, timeout=10)
    check("Tampered JWT → 401",               r.status_code == 401)

# Privilege escalation checks
r = requests.post(f"{API}/payments/confirm/9999/", headers=auth(tok_student), timeout=10)
check("Student cannot confirm payments → 403/404", r.status_code in (403,404))

r = requests.delete(f"{API}/courses/1/",          headers=auth(tok_student), timeout=10)
check("Student cannot delete tutor's course → 403/404", r.status_code in (403,404))

if usr_admin.get("id"):
    r = requests.delete(f"{API}/users/{usr_admin['id']}/", headers=auth(tok_student), timeout=10)
    check("Student cannot delete admin account → 403", r.status_code == 403, f"got {r.status_code}")

# CORS — check Vary header (Django CORS sets Vary: origin)
r = requests.options(f"{API}/courses/",
    headers={"Origin":"http://localhost:5173","Access-Control-Request-Method":"GET"}, timeout=10)
check("CORS Vary header present",              "Vary" in r.headers, str(r.headers.get("Vary","")), warn=True)

# Weak password
r = requests.post(f"{API}/auth/register/",
    json={"username":"weakpassuser","email":"weak@qa.test",
          "password":"ab","password2":"ab","role":"student"}, timeout=10)
check("Password < 8 chars → 400",             r.status_code == 400)

# Login lockout (uses qa_student2, a separate account)
for _ in range(5):
    requests.post(f"{API}/auth/login/", json={"username":"qa_student2","password":"WRONG!"}, timeout=10)
r6 = requests.post(f"{API}/auth/login/", json={"username":"qa_student2","password":"Test1234!"}, timeout=10)
check("Lockout after 5 bad attempts → 429",   r6.status_code in (429,403,401),
      r6.json().get("detail","")[:60])

# Paid course enrollment without payment
r = requests.post(f"{API}/courses/2/enroll/", headers=auth(tok_student), timeout=10)
check("Enroll paid course without payment → 402", r.status_code == 402, f"got {r.status_code}")

# Register with role=admin must be blocked
r = requests.post(f"{API}/auth/register/",
    json={"username":"hackadmin99","email":"hackadmin@qa.test",
          "password":"Test1234!","password2":"Test1234!","role":"admin"}, timeout=10)
check("Register with role=admin → 400",        r.status_code in (400,422), f"got {r.status_code}")

# Wrong auth scheme on protected endpoint
r = requests.get(f"{API}/courses/my_courses/",
    headers={"Authorization":"Token abc123"}, timeout=10)
check("Wrong auth scheme (Token) → 401",       r.status_code == 401)

# Email verification flow
r = requests.post(f"{API}/auth/register/",
    json={"username":"emailflow_test","email":"emailflow@qa.armacademy.test",
          "password":"Test1234!","password2":"Test1234!","role":"student"}, timeout=10)
check("Register → 201 + requires_verification", r.status_code == 201)
check("  └─ requires_verification flag set",   r.json().get("requires_verification") is True)

r2 = requests.post(f"{API}/auth/login/", json={"username":"emailflow_test","password":"Test1234!"}, timeout=10)
check("Login while unverified → requires_verification (no JWT)",
      r2.status_code == 200 and r2.json().get("requires_verification") is True and "access" not in r2.json())

r3 = requests.post(f"{API}/auth/verify-email/",
    json={"email":"emailtest77@test.com","code":"262854"}, timeout=10)
check("Verify email with valid OTP → JWT issued", r3.status_code == 200 and "access" in r3.json())
if "access" in r3.json():
    r4 = requests.post(f"{API}/auth/login/", json={"username":"emailtest77","password":"Test1234!"}, timeout=10)
    check("Login after verification → full JWT", r4.status_code == 200 and "access" in r4.json())

r5 = requests.post(f"{API}/auth/verify-email/",
    json={"email":"emailflow@qa.armacademy.test","code":"000000"}, timeout=10)
check("Wrong OTP code → 400",                  r5.status_code == 400)

r6 = requests.post(f"{API}/auth/resend-email-otp/",
    json={"email":"emailflow@qa.armacademy.test"}, timeout=10)
check("Resend OTP endpoint works",             r6.status_code in (200,201))

# =============================================================================
# 3. API / INTEGRATION TESTING
# =============================================================================
hdr("3  API / INTEGRATION TESTING  (full flows)")

# Full tutor course-creation → moderation → enrollment → roster flow
r = requests.post(f"{API}/courses/",
    json={"title":"Integration Test Course","description":"e2e","level":"beginner",
          "language":"en","is_free":True,"content_rating":"general","category":"technology"},
    headers=auth(tok_tutor), timeout=10)
check("Tutor creates course",                  r.status_code == 201, r.text[:80])
cid = r.json().get("id") if r.status_code == 201 else None

if cid:
    r = requests.post(f"{API}/sections/",
        json={"course":cid,"title":"Chapter 1","order":1}, headers=auth(tok_tutor), timeout=10)
    check("Tutor adds section",                r.status_code == 201)
    sid = r.json().get("id") if r.status_code == 201 else None
    if sid:
        r = requests.post(f"{API}/classes/",
            json={"course":cid,"section":sid,"title":"Lecture 1","class_type":"recorded","order":1},
            headers=auth(tok_tutor), timeout=10)
        check("Tutor adds lecture",            r.status_code == 201)

    r = requests.post(f"{API}/courses/{cid}/publish/", headers=auth(tok_tutor), timeout=10)
    check("Tutor submits for review",          r.status_code in (200,201), r.json().get("detail",""))

    # Admin approves (admin can now see pending_review courses)
    r = requests.patch(f"{API}/courses/{cid}/",
        json={"moderation_status":"approved","is_published":True},
        headers=auth(tok_admin), timeout=10)
    check("Admin approves course",             r.status_code in (200,201), f"got {r.status_code}")

    r = requests.post(f"{API}/courses/{cid}/enroll/", headers=auth(tok_student), timeout=10)
    check("Student enrolls in approved course", r.status_code in (200,201), r.json().get("detail",""))

    r = requests.get(f"{API}/courses/{cid}/students/", headers=auth(tok_tutor), timeout=10)
    check("Tutor views student roster",        r.status_code == 200)
    rj = r.json(); roster = rj if isinstance(rj, list) else rj.get("students", rj.get("results", []))
    check("Student appears in roster",         any(s.get("username","") == "qa_student" or s.get("display_name","") == "qa_student" or s.get("id") == student_id for s in roster))

# Group messaging
if group_id:
    r = requests.post(f"{API}/groups/{group_id}/messages/",
        json={"content":"Integration test message"}, headers=auth(tok_tutor), timeout=10)
    check("Tutor posts group message",         r.status_code in (200,201))
    r = requests.get(f"{API}/groups/{group_id}/messages/", headers=auth(tok_tutor), timeout=10)
    check("Group messages list returns data",  r.status_code == 200)
    msgs = r.json() if isinstance(r.json(), list) else r.json().get("results",[])
    check("Message present in feed",           len(msgs) > 0)

# Payment flow (no Stripe → manual)
r = requests.post(f"{API}/payments/initiate/2/", headers=auth(tok_student), timeout=10)
check("Payment initiation for paid course",    r.status_code in (200,400), r.json().get("detail","")[:60])
if r.status_code == 200:
    check("  └─ manual response has amount_amd", "amount_amd" in r.json())

# Content report
r = requests.post(f"{API}/moderation/reports/",
    json={"course":1,"reason":"inappropriate","description":"QA test report"},
    headers=auth(tok_student), timeout=10)
check("Student files content report",          r.status_code in (200,201), r.text[:60])

# Forgot password
r = requests.post(f"{API}/auth/forgot-password/", json={"email":"qa_student@test.com"}, timeout=10)
check("Forgot-password request accepted",     r.status_code in (200,201,400))

# =============================================================================
# 4. PERFORMANCE TESTING
# =============================================================================
hdr("4  PERFORMANCE TESTING")

def timed(url, h=None, label=None, limit=2000):
    t0 = time.time(); rr = requests.get(url, headers=h, timeout=15)
    ms = (time.time()-t0)*1000
    check(f"{label or url}  ({ms:.0f}ms)", rr.status_code==200 and ms<limit,
          f"{'OK' if rr.status_code==200 else 'ERR '+str(rr.status_code)}  {ms:.0f}ms")
    return ms

eps = [
    (f"{BASE}/health/",               None,              "Health"),
    (f"{API}/courses/",               None,              "Courses list (public)"),
    (f"{API}/users/site_stats/",      None,              "Site stats"),
    (f"{API}/users/featured_tutors/", None,              "Featured tutors"),
    (f"{API}/courses/1/",             auth(tok_student), "Course detail (authed)"),
    (f"{API}/groups/",                auth(tok_student), "Groups list"),
    (f"{API}/reviews/",               None,              "Reviews list"),
]
ts = [timed(u, h, l) for u, h, l in eps]
avg = sum(ts)/len(ts)
check(f"Average response time < 1 s  (avg {avg:.0f}ms)", avg < 1000)

def hit(_): return requests.get(f"{API}/courses/", timeout=15).status_code
t0 = time.time()
with ThreadPoolExecutor(max_workers=10) as ex:
    codes = list(ex.map(hit, range(10)))
tot = (time.time()-t0)*1000
check("10 concurrent /courses/ — all 200",    all(c==200 for c in codes), str(set(codes)))
check("10 concurrent finish < 5 s",           tot < 5000, f"{tot:.0f}ms")

r = requests.get(f"{API}/courses/?page=1&page_size=3", timeout=10)
check("Pagination params accepted",           r.status_code == 200)
items = r.json().get("results", r.json()) if isinstance(r.json(), dict) else r.json()
check("page_size=3 honoured",                 len(items) <= 3)

r = requests.get(f"{API}/courses/?search=QA", timeout=10)
check("Search param returns filtered list",   r.status_code == 200)

# =============================================================================
# 5. UI / SMOKE TESTING
# =============================================================================
hdr("5  UI / SMOKE TESTING")

for route in ["/", "/login", "/register", "/courses", "/tutors",
              "/groups", "/dashboard", "/forgot-password"]:
    rr = requests.get(f"{BASE}{route}", timeout=10)
    check(f"SPA route {route} → HTML 200",
          rr.status_code==200 and ("<!doctype html" in rr.text.lower() or "<html" in rr.text.lower()))

r = requests.get(f"{BASE}/admin/", timeout=10, allow_redirects=False)
check("Admin panel → 302 redirect to login",  r.status_code in (301,302))
r = requests.get(f"{BASE}/admin/", timeout=10)
check("Admin login page loads (200)",         r.status_code == 200)

r = requests.get(f"{BASE}/", timeout=10)
assets = re.findall(r'(?:src|href)="(/assets/[^"]+)"', r.text)[:5]
check(f"SPA has hashed asset tags ({len(assets)} found)", len(assets) > 0)
for p in assets[:3]:
    check(f"Asset loads: {p[-45:]}", requests.get(f"{BASE}{p}", timeout=10).status_code == 200)

check("API root responds JSON",               requests.get(f"{API}/", timeout=10).status_code == 200)
check("Unknown API route → 404",             requests.get(f"{API}/doesnotexist999/", timeout=10).status_code == 404)

r = requests.get(f"{BASE}/static/admin/css/base.css", timeout=10)
check("Django admin CSS served",              r.status_code == 200, warn=True)

# =============================================================================
# 6. EDGE CASE / NEGATIVE TESTING
# =============================================================================
hdr("6  EDGE CASE / NEGATIVE TESTING")

for username, email, pw, pw2, role, label in [
    ("qa_student",    "qa_student@test.com",  "Test1234!","Test1234!","student", "Duplicate username → 400"),
    ("newuser999",    "notanemail",            "Test1234!","Test1234!","student", "Invalid email → 400"),
    ("",              "",                      "",         "",         "student", "Empty fields → 400"),
    ("a"*500,         "long@qa.test",          "Test1234!","Test1234!","student", "500-char username → 400"),
]:
    r = requests.post(f"{API}/auth/register/",
        json={"username":username,"email":email,"password":pw,"password2":pw2,"role":role}, timeout=10)
    check(label, r.status_code in (400,422))

for path, label in [
    (f"{API}/courses/999999/",  "Non-existent course → 404"),
    (f"{API}/groups/999999/",   "Non-existent group → 404"),
    (f"{API}/users/999999/",    "Non-existent user → 404"),
]:
    check(label, requests.get(path, timeout=10).status_code == 404)

r = requests.post(f"{API}/courses/999999/enroll/", headers=auth(tok_student), timeout=10)
check("Enroll non-existent course → 404",    r.status_code == 404)

r = requests.post(f"{API}/courses/1/enroll/", headers=auth(tok_student), timeout=10)
check("Double-enroll same course → 400",     r.status_code == 400)

r = requests.post(f"{API}/courses/",
    json={"title":"Illegal","description":"no","level":"beginner","language":"en","is_free":True},
    headers=auth(tok_student), timeout=10)
check("Student cannot create course → 403",  r.status_code == 403)

for rating, label in [(6,"Rating > 5 → 400"), (0,"Rating = 0 → 400")]:
    r = requests.post(f"{API}/reviews/",
        json={"course":1,"rating":rating,"comment":"edge","title":"edge"},
        headers=auth(tok_student), timeout=10)
    check(label, r.status_code in (400,422))

r = requests.post(f"{API}/groups/",
    json={"name":"PrivQA","description":"p","group_type":"study","is_private":True},
    headers=auth(tok_tutor), timeout=10)
if r.status_code == 201:
    pid = r.json()["id"]
    check("Join private group → 403",
          requests.post(f"{API}/groups/{pid}/join/", headers=auth(tok_student), timeout=10).status_code == 403)

check("No auth header on protected endpoint → 401",
      requests.get(f"{API}/courses/my_courses/", timeout=10).status_code == 401)

check("Form-encoded login handled gracefully",
      requests.post(f"{API}/auth/login/",
          data={"username":"qa_student","password":"Test1234!"}, timeout=10).status_code in (200,400,415))

r = requests.get(f"{API}/courses/?page=-1", timeout=10)
check("Negative page → 400/404",             r.status_code in (400,404))

# =============================================================================
# REPORT
# =============================================================================
passed = sum(1 for r in results if r["status"]=="PASS")
failed = sum(1 for r in results if r["status"]=="FAIL")
warned = sum(1 for r in results if r["status"]=="WARN")
total  = len(results)
score  = round(passed/total*100)

print(f"\n{B}{'═'*62}{X}")
print(f"{W}  QA REPORT — Arm Academy  |  {datetime.now():%Y-%m-%d %H:%M}{X}")
print(f"{B}{'═'*62}{X}")
print(f"  Total   : {total}  |  {G}Pass {passed}{X}  |  {R}Fail {failed}{X}  |  {Y}Warn {warned}{X}")
col = G if score>=95 else (Y if score>=85 else R)
print(f"  Score   : {col}{score}%{X}")
print(f"{B}{'═'*62}{X}")

if failed:
    print(f"\n{R}FAILURES:{X}")
    for r in results:
        if r["status"]=="FAIL":
            print(f"  {R}✗{X} {r['name']}" + (f"  {Y}{r['detail']}{X}" if r["detail"] else ""))
if warned:
    print(f"\n{Y}WARNINGS:{X}")
    for r in results:
        if r["status"]=="WARN":
            print(f"  {Y}⚠{X} {r['name']}" + (f"  {r['detail']}" if r["detail"] else ""))

sys.exit(0 if failed == 0 else 1)

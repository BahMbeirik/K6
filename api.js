import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  // 1) تسجيل مستخدم جديد بإسم فريد
  const username = `user_${__VU}_${__ITER}_${Date.now()}`;
  const password = 'Test1234!';

  const registerRes = http.post(
    `${BASE_URL}/api/users`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(registerRes, {
    'register status is 201': (r) => r.status === 201,
  });

  // 2) تسجيل الدخول والحصول على token
  const loginRes = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify({ username, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'token exists': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');

  // 3) استخدام الـ token في طلب محمي
  const ratingsRes = http.get(`${BASE_URL}/api/ratings`, {
    headers: { Authorization: `Token ${token}` },
  });
  check(ratingsRes, {
    'ratings status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
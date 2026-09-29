import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    // threshold لكل وسم على حدة
    'http_req_duration{name:register}': ['p(95)<800'],
    'http_req_duration{name:login}': ['p(95)<800'],
    'http_req_duration{name:ratings}': ['p(95)<500'],
    // threshold على المجموعة كلها
    'group_duration{group:::auth flow}': ['p(95)<2000'],
  },
};

export default function () {
  const username = `user_${__VU}_${__ITER}_${Date.now()}`;
  const password = 'Test1234!';
  let token;

  group('auth flow', () => {
    const registerRes = http.post(
      `${BASE_URL}/api/users`,
      JSON.stringify({ username, password }),
      { headers: JSON_HEADERS, tags: { name: 'register' } }
    );
    check(registerRes, { 'register 201': (r) => r.status === 201 });

    const loginRes = http.post(
      `${BASE_URL}/api/users/token/login`,
      JSON.stringify({ username, password }),
      { headers: JSON_HEADERS, tags: { name: 'login' } }
    );
    check(loginRes, { 'login 200': (r) => r.status === 200 });
    token = loginRes.json('token');
  });

  group('browse', () => {
    const res = http.get(`${BASE_URL}/api/ratings`, {
      headers: { Authorization: `Token ${token}` },
      tags: { name: 'ratings' },
    });
    check(res, { 'ratings 200': (r) => r.status === 200 });
  });

  sleep(1);
}
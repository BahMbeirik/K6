import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const BASE_URL = __ENV.BASE_URL || 'https://quickpizza.grafana.com';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const users = new SharedArray('users', () =>
  papaparse.parse(open('./users.csv'), { header: true, skipEmptyLines: true }).data
);

export const options = {
  vus: Number(__ENV.VUS) || 3,
  duration: __ENV.DURATION || '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:login}': ['p(95)<800'],
    'http_req_duration{name:ratings}': ['p(95)<500'],
  },
};

let token; // متغير على مستوى الـ VU، يبقى بين الـ iterations

export default function () {
  const user = users[(__VU - 1) % users.length];

  if (!token) {
    // أول iteration لهذا الـ VU فقط: سجّل ثم ادخل
    http.post(`${BASE_URL}/api/users`, JSON.stringify(user), {
      headers: JSON_HEADERS,
      tags: { name: 'register' },
      responseCallback: http.expectedStatuses(201, 400, 409),
    });

    const loginRes = http.post(`${BASE_URL}/api/users/token/login`, JSON.stringify(user), {
      headers: JSON_HEADERS,
      tags: { name: 'login' },
    });
    const ok = check(loginRes, { 'login 200': (r) => r.status === 200 });
    if (!ok) {
      console.log(`VU${__VU} login FAIL status=${loginRes.status} body=${loginRes.body}`);
      return;
    }
    token = loginRes.json('token');
  }

  const res = http.get(`${BASE_URL}/api/ratings`, {
    headers: { Authorization: `Token ${token}` },
    tags: { name: 'ratings' },
  });
  check(res, { 'ratings 200': (r) => r.status === 200 });

  sleep(1);
}
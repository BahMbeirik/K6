import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = 'https://quickpizza.grafana.com';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// المقاييس المخصّصة (تُعرَّف في مرحلة Init)
const loginTime = new Trend('login_time', true);       // true = القيم بالميلي ثانية (زمن)
const loginSuccess = new Rate('login_success');
const failedLogins = new Counter('failed_logins');
const flowTime = new Trend('full_flow_time', true);

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: {
    login_time: ['p(95)<800'],
    login_success: ['rate>0.99'],
    failed_logins: ['count<3'],
    full_flow_time: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const flowStart = Date.now();

  const username = `user_${__VU}_${__ITER}_${Date.now()}`;
  const creds = JSON.stringify({ username, password: 'Test1234!' });

  http.post(`${BASE_URL}/api/users`, creds, {
    headers: JSON_HEADERS,
    tags: { name: 'register' },
  });

  const loginRes = http.post(`${BASE_URL}/api/users/token/login`, creds, {
    headers: JSON_HEADERS,
    tags: { name: 'login' },
  });

  const ok = loginRes.status === 200;
  check(loginRes, { 'login 200': () => ok });

  if (ok) {
    loginTime.add(loginRes.timings.duration);
  }
  loginSuccess.add(ok);
  if (!ok) failedLogins.add(1);

  if (ok) {
    http.get(`${BASE_URL}/api/ratings`, {
      headers: { Authorization: `Token ${loginRes.json('token')}` },
      tags: { name: 'ratings' },
    });
  }

  flowTime.add(Date.now() - flowStart);
  sleep(1);
}
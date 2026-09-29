import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    http_req_failed: ['rate<0.01'],      // أقل من 1% أخطاء
    http_req_duration: ['p(95)<500'],    // 95% من الطلبات أسرع من 500ms
    checks: ['rate>0.99'],               // 99% من الـ checks تنجح
  },
};

export default function () {
  const res = http.get('https://quickpizza.grafana.com');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body.length > 0,
    'response < 400ms': (r) => r.timings.duration < 400,
  });

  sleep(1);
}
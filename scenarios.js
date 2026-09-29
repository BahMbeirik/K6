import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';

export const options = {
  scenarios: {
    // نموذج مغلق: 5 مستخدمين ثابتين
    closed_model: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
      exec: 'homePage',
    },
    // نموذج مفتوح: 3 iterations في الثانية بغض النظر عن سرعة الخادم
    open_model: {
      executor: 'constant-arrival-rate',
      rate: 3,
      timeUnit: '1s',
      duration: '20s',
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: 'homePage',
      startTime: '25s', // يبدأ بعد انتهاء الأول
    },
  },
  thresholds: {
    'http_req_duration{scenario:closed_model}': ['p(95)<500'],
    'http_req_duration{scenario:open_model}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function homePage() {
  const res = http.get(BASE_URL);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
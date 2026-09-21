import { test, expect } from '@playwright/test';
import { guardPublicSubmission } from '../../lib/security/submission-guard';

test('a burst of 50 quote submissions is rejected after the configured limit', async () => {
  const maximum = 10;
  let count = 0;
  const results = [];

  for (let request = 0; request < 50; request += 1) {
    results.push(await guardPublicSubmission('', async () => {
      count += 1;
      return { allowed: count <= maximum, retryAfter: count <= maximum ? 0 : 60 };
    }));
  }

  expect(results.slice(0, maximum).every((result) => result.allowed)).toBe(true);
  expect(results.slice(maximum).every((result) => !result.allowed && !result.silentlyDrop)).toBe(true);
});

test('a filled honeypot is silently dropped without consulting the limiter', async () => {
  let limiterCalls = 0;
  const result = await guardPublicSubmission('https://spam.invalid', async () => {
    limiterCalls += 1;
    return { allowed: true };
  });

  expect(result).toEqual({ allowed: false, silentlyDrop: true });
  expect(limiterCalls).toBe(0);
});

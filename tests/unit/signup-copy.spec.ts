import { expect, test } from '@playwright/test'
import { CUSTOMER_SIGNUP_COPY, PRO_SIGNUP_COPY } from '../../lib/auth/signup-copy'

test('signup copy matches the selected side of the marketplace', () => {
  expect(PRO_SIGNUP_COPY.description).toBe('Set up your service professional account')
  expect(PRO_SIGNUP_COPY.businessPlaceholder).toBe('Acme Home Services')
  expect(PRO_SIGNUP_COPY.consent).toContain('about my pro account and marketplace activity')
  expect(PRO_SIGNUP_COPY.consent).not.toContain('respond to my request')
  expect(PRO_SIGNUP_COPY.description.toLowerCase()).not.toContain('cleaning')
  expect(PRO_SIGNUP_COPY.businessPlaceholder.toLowerCase()).not.toContain('cleaning')

  expect(CUSTOMER_SIGNUP_COPY.description).toBe('Sign up to find local service professionals')
  expect(CUSTOMER_SIGNUP_COPY.consent).toContain('respond to my request')
})

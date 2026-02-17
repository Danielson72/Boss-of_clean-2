/**
 * Quote Request Client
 *
 * Thin wrapper around POST /api/quote for submitting quote requests.
 * Handles customer rate limits, cleaner tier limits, and validation.
 */

export interface QuoteRequestPayload {
  cleaner_id: string;
  service_type: string;
  zip_code: string;
  service_date?: string | null | undefined;
  service_time?: string | null | undefined;
  address?: string | null | undefined;
  city?: string | null | undefined;
  description?: string | null | undefined;
  special_requests?: string | null | undefined;
  property_type?: string | null | undefined;
  property_size?: string | null | undefined;
  frequency?: string | null | undefined;
  duration_hours?: string | null | undefined;
  customer_name?: string | null | undefined;
  customer_email?: string | null | undefined;
  customer_phone?: string | null | undefined;
}

export interface QuoteSuccessResponse {
  success: true;
  quoteId: string;
  message: string;
}

export interface CustomerLimitError {
  error: 'customer_limit_reached';
  reason: 'daily_limit_exceeded' | 'monthly_limit_exceeded';
  daily: number;
  monthly: number;
  action: 'signup_for_unlimited' | 'verify_email_for_unlimited' | 'contact_support';
}

export interface CleanerCapacityError {
  error: 'cleaner_at_monthly_cap';
  message: string;
  upgradeHint: true;
}

export interface ValidationError {
  error: 'validation_error';
  detail: string;
}

export interface InternalError {
  error: 'limit_check_failed' | 'quote_create_failed' | 'internal_error';
  detail: string;
}

export type QuoteErrorResponse =
  | CustomerLimitError
  | CleanerCapacityError
  | ValidationError
  | InternalError;

export type QuoteResponse = QuoteSuccessResponse | QuoteErrorResponse;

/**
 * Submit a quote request to the API
 *
 * @param payload - Quote request details
 * @returns Promise resolving to success or error response
 *
 * @example
 * ```ts
 * const result = await submitQuote({
 *   cleaner_id: 'uuid',
 *   service_type: 'residential',
 *   customer_email: 'user@example.com',
 *   zip_code: '33101'
 * });
 *
 * if (result.success) {
 *   console.log('Quote ID:', result.quoteId);
 * } else {
 *   // Handle errors
 *   if (result.error === 'customer_limit_reached') {
 *     showGuestLimitModal(result);
 *   }
 * }
 * ```
 */
export async function submitQuote(
  payload: QuoteRequestPayload
): Promise<QuoteResponse> {
  try {
    const response = await fetch('/api/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Return response regardless of status code
    // Caller will check data.success or data.error
    return data;
  } catch (error: any) {
    // Network or parsing error
    console.error('[quoteClient] Request failed:', error);
    return {
      error: 'internal_error',
      detail: error.message || 'Failed to submit quote request',
    };
  }
}

/**
 * Type guard to check if response is a success
 */
export function isQuoteSuccess(
  response: QuoteResponse
): response is QuoteSuccessResponse {
  return 'success' in response && response.success === true;
}

/**
 * Type guard to check if response is a customer limit error
 */
export function isCustomerLimitError(
  response: QuoteResponse
): response is CustomerLimitError {
  return 'error' in response && response.error === 'customer_limit_reached';
}

/**
 * Type guard to check if response is a cleaner capacity error
 */
export function isCleanerCapacityError(
  response: QuoteResponse
): response is CleanerCapacityError {
  return 'error' in response && response.error === 'cleaner_at_monthly_cap';
}

/**
 * Type guard to check if response is a validation error
 */
export function isValidationError(
  response: QuoteResponse
): response is ValidationError {
  return 'error' in response && response.error === 'validation_error';
}

/**
 * Validate quote request payload before submission
 * Returns error message if invalid, null if valid
 */
export function validateQuotePayload(payload: Partial<QuoteRequestPayload>): string | null {
  if (!payload.cleaner_id) {
    return 'Cleaner ID is required';
  }

  if (!payload.service_type) {
    return 'Service type is required';
  }

  if (!payload.zip_code) {
    return 'ZIP code is required';
  }

  return null;
}

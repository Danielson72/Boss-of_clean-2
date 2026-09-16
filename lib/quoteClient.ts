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

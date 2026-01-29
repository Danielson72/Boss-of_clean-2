import { getStripe } from './config';
import { createLogger } from '../utils/logger';
import type Stripe from 'stripe';

const logger = createLogger({ file: 'lib/stripe/billing-service' });

export interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface InvoiceInfo {
  id: string;
  number: string | null;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'void' | 'uncollectible';
  invoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAt: string | null;
  canceledAt: string | null;
  priceId: string | null;
  amount: number;
}

/**
 * Get default payment method for a Stripe customer
 */
export async function getCustomerPaymentMethods(
  customerId: string
): Promise<{ paymentMethods: PaymentMethodInfo[]; defaultPaymentMethodId: string | null }> {
  try {
    const stripe = getStripe();

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const defaultPaymentMethodId = typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id || null;

    // List all payment methods
    const paymentMethodsResponse = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const paymentMethods: PaymentMethodInfo[] = paymentMethodsResponse.data
      .filter((pm) => pm.card)
      .map((pm) => ({
        id: pm.id,
        brand: pm.card!.brand,
        last4: pm.card!.last4,
        expMonth: pm.card!.exp_month,
        expYear: pm.card!.exp_year,
        isDefault: pm.id === defaultPaymentMethodId,
      }));

    return { paymentMethods, defaultPaymentMethodId };
  } catch (error) {
    logger.error('Error fetching payment methods:', {}, error);
    return { paymentMethods: [], defaultPaymentMethodId: null };
  }
}

/**
 * Get invoice history for a Stripe customer
 */
export async function getCustomerInvoiceHistory(
  customerId: string,
  limit: number = 10
): Promise<InvoiceInfo[]> {
  try {
    const stripe = getStripe();

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
      expand: ['data.lines'],
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id || `inv_${invoice.created}`,
      number: invoice.number,
      date: new Date(invoice.created * 1000).toISOString(),
      description: invoice.description ||
        invoice.lines.data[0]?.description ||
        'Subscription payment',
      amount: invoice.total / 100,
      status: mapInvoiceStatus(invoice.status),
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
    }));
  } catch (error) {
    logger.error('Error fetching invoices:', {}, error);
    return [];
  }
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscriptionDetails(
  subscriptionId: string
): Promise<SubscriptionInfo | null> {
  try {
    const stripe = getStripe();

    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
    const subscription = subscriptionResponse as unknown as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };

    const price = subscription.items.data[0]?.price;

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      priceId: price?.id || null,
      amount: price?.unit_amount ? price.unit_amount / 100 : 0,
    };
  } catch (error) {
    logger.error('Error fetching subscription:', {}, error);
    return null;
  }
}

/**
 * Get subscription with payment method details
 */
export async function getSubscriptionWithPaymentMethod(
  subscriptionId: string
): Promise<{ subscription: SubscriptionInfo | null; paymentMethod: PaymentMethodInfo | null }> {
  try {
    const stripe = getStripe();

    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'items.data.price'],
    });
    const subscription = subscriptionResponse as unknown as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };

    const price = subscription.items.data[0]?.price;
    const pm = subscription.default_payment_method;

    let paymentMethod: PaymentMethodInfo | null = null;
    if (pm && typeof pm !== 'string' && pm.card) {
      paymentMethod = {
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: true,
      };
    }

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAt: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        priceId: price?.id || null,
        amount: price?.unit_amount ? price.unit_amount / 100 : 0,
      },
      paymentMethod,
    };
  } catch (error) {
    logger.error('Error fetching subscription with payment method:', {}, error);
    return { subscription: null, paymentMethod: null };
  }
}

/**
 * Map Stripe invoice status to simplified status
 */
function mapInvoiceStatus(
  stripeStatus: Stripe.Invoice.Status | null
): InvoiceInfo['status'] {
  switch (stripeStatus) {
    case 'paid':
      return 'paid';
    case 'open':
    case 'draft':
      return 'pending';
    case 'void':
      return 'void';
    case 'uncollectible':
      return 'uncollectible';
    default:
      return 'pending';
  }
}

/**
 * Update default payment method for a customer
 */
export async function updateDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = getStripe();

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return { success: true };
  } catch (error) {
    logger.error('Error updating default payment method:', {}, error);
    return { success: false, error: 'Failed to update payment method' };
  }
}

/**
 * Preview upcoming invoice for a subscription
 */
export async function previewUpcomingInvoice(
  customerId: string,
  subscriptionId?: string
): Promise<InvoiceInfo | null> {
  try {
    const stripe = getStripe();

    const params: Stripe.InvoiceCreatePreviewParams = {
      customer: customerId,
    };

    if (subscriptionId) {
      params.subscription = subscriptionId;
    }

    const invoice = await stripe.invoices.createPreview(params);

    return {
      id: 'upcoming',
      number: null,
      date: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : new Date().toISOString(),
      description: 'Upcoming invoice',
      amount: invoice.total / 100,
      status: 'pending',
      invoiceUrl: null,
      invoicePdf: null,
    };
  } catch (error) {
    // No upcoming invoice is common and not an error
    return null;
  }
}

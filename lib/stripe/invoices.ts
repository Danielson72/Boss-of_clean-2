import Stripe from 'stripe';
import { getStripe } from './config';

export interface InvoiceData {
  id: string;
  number: string | null;
  date: string;
  dueDate: string | null;
  description: string;
  amount: number;
  amountDue: number;
  amountPaid: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded' | 'void' | 'uncollectible';
  invoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string | null;
  amount: number;
  quantity: number | null;
}

/**
 * Map Stripe invoice status to our simplified status
 */
function mapInvoiceStatus(
  stripeStatus: Stripe.Invoice.Status | null
): InvoiceData['status'] {
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
 * Convert Stripe invoice to our InvoiceData format
 */
function formatInvoice(invoice: Stripe.Invoice): InvoiceData {
  return {
    id: invoice.id || `inv_${invoice.created}`,
    number: invoice.number,
    date: new Date(invoice.created * 1000).toISOString(),
    dueDate: invoice.due_date
      ? new Date(invoice.due_date * 1000).toISOString()
      : null,
    description:
      invoice.description ||
      invoice.lines.data[0]?.description ||
      'Subscription payment',
    amount: invoice.total / 100,
    amountDue: invoice.amount_due / 100,
    amountPaid: invoice.amount_paid / 100,
    status: mapInvoiceStatus(invoice.status),
    invoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdf: invoice.invoice_pdf ?? null,
    periodStart: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : new Date(invoice.created * 1000).toISOString(),
    periodEnd: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : new Date(invoice.created * 1000).toISOString(),
    lines: invoice.lines.data.map((line) => ({
      id: line.id,
      description: line.description,
      amount: line.amount / 100,
      quantity: line.quantity,
    })),
  };
}

/**
 * Fetch all invoices for a Stripe customer
 */
export async function getCustomerInvoices(
  customerId: string,
  options?: {
    limit?: number;
    startingAfter?: string;
    status?: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  }
): Promise<{ invoices: InvoiceData[]; hasMore: boolean }> {
  const stripe = getStripe();

  const params: Stripe.InvoiceListParams = {
    customer: customerId,
    limit: options?.limit || 20,
    expand: ['data.lines'],
  };

  if (options?.startingAfter) {
    params.starting_after = options.startingAfter;
  }

  if (options?.status) {
    params.status = options.status;
  }

  const invoicesResponse = await stripe.invoices.list(params);

  return {
    invoices: invoicesResponse.data.map(formatInvoice),
    hasMore: invoicesResponse.has_more,
  };
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceData | null> {
  const stripe = getStripe();

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['lines'],
    });

    return formatInvoice(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}

/**
 * Get upcoming invoice for a subscription (preview of next charge)
 */
export async function getUpcomingInvoice(
  customerId: string,
  subscriptionId?: string
): Promise<InvoiceData | null> {
  const stripe = getStripe();

  try {
    // Use createPreview to preview the next invoice
    const invoice = await stripe.invoices.createPreview({
      customer: customerId,
      ...(subscriptionId && { subscription: subscriptionId }),
    });

    // Upcoming invoices don't have a real ID
    return {
      id: 'upcoming',
      number: null,
      date: new Date().toISOString(),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date * 1000).toISOString()
        : null,
      description: 'Upcoming invoice',
      amount: invoice.total / 100,
      amountDue: invoice.amount_due / 100,
      amountPaid: 0,
      status: 'pending',
      invoiceUrl: null,
      invoicePdf: null,
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : new Date().toISOString(),
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : new Date().toISOString(),
      lines: invoice.lines.data.map((line) => ({
        id: line.id,
        description: line.description,
        amount: line.amount / 100,
        quantity: line.quantity,
      })),
    };
  } catch (error) {
    // No upcoming invoice is not an error, just return null
    return null;
  }
}

/**
 * Send invoice to customer via email
 */
export async function sendInvoice(invoiceId: string): Promise<boolean> {
  const stripe = getStripe();

  try {
    await stripe.invoices.sendInvoice(invoiceId);
    return true;
  } catch (error) {
    console.error('Error sending invoice:', error);
    return false;
  }
}


import { InvoiceData, InvoiceFormData } from "@/types/invoice";

const STORAGE_KEY = 'invoice-app-invoices';

// Get all invoices for a user
export const getUserInvoices = (userId: string): InvoiceData[] => {
  const storedInvoices = localStorage.getItem(STORAGE_KEY);
  if (!storedInvoices) return [];
  
  const allInvoices: InvoiceData[] = JSON.parse(storedInvoices);
  return allInvoices.filter(invoice => invoice.userId === userId);
};

// Get a specific invoice
export const getInvoiceById = (invoiceId: string): InvoiceData | null => {
  const storedInvoices = localStorage.getItem(STORAGE_KEY);
  if (!storedInvoices) return null;
  
  const allInvoices: InvoiceData[] = JSON.parse(storedInvoices);
  return allInvoices.find(invoice => invoice.id === invoiceId) || null;
};

// Create a new invoice
export const createInvoice = (userId: string, invoiceData: InvoiceFormData): InvoiceData => {
  const storedInvoices = localStorage.getItem(STORAGE_KEY);
  const allInvoices: InvoiceData[] = storedInvoices ? JSON.parse(storedInvoices) : [];

  // Calculate financial values
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * invoiceData.taxRate) / 100;
  
  // Apply discount based on total amount
  let discountRate = invoiceData.discountRate;
  // If subtotal is over 1000, give at least 5% discount
  if (subtotal > 1000 && discountRate < 5) {
    discountRate = 5;
  }
  // If subtotal is over 5000, give at least 10% discount
  if (subtotal > 5000 && discountRate < 10) {
    discountRate = 10;
  }
  
  const discountAmount = (subtotal * discountRate) / 100;
  const total = subtotal + taxAmount - discountAmount;

  const newInvoice: InvoiceData = {
    id: `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    userId,
    subtotal,
    taxAmount,
    discountRate,
    discountAmount,
    total,
    status: 'pending',
    ...invoiceData
  };

  allInvoices.push(newInvoice);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allInvoices));
  
  return newInvoice;
};

// Update an invoice
export const updateInvoice = (invoiceId: string, invoiceData: Partial<InvoiceData>): InvoiceData | null => {
  const storedInvoices = localStorage.getItem(STORAGE_KEY);
  if (!storedInvoices) return null;
  
  let allInvoices: InvoiceData[] = JSON.parse(storedInvoices);
  const invoiceIndex = allInvoices.findIndex(invoice => invoice.id === invoiceId);
  
  if (invoiceIndex === -1) return null;
  
  allInvoices[invoiceIndex] = {
    ...allInvoices[invoiceIndex],
    ...invoiceData
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allInvoices));
  return allInvoices[invoiceIndex];
};

// Delete an invoice
export const deleteInvoice = (invoiceId: string): boolean => {
  const storedInvoices = localStorage.getItem(STORAGE_KEY);
  if (!storedInvoices) return false;
  
  let allInvoices: InvoiceData[] = JSON.parse(storedInvoices);
  const filteredInvoices = allInvoices.filter(invoice => invoice.id !== invoiceId);
  
  if (filteredInvoices.length === allInvoices.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredInvoices));
  return true;
};

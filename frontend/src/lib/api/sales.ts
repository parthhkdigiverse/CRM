import { apiClient } from '../axios';

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Sale {
  id: string;
  reference_number: string;
  sale_date: string;
  customer_name: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const getSales = async () => {
  const response = await apiClient.get('/sales/');
  return response.data.data;
};

export const createSale = async (data: Partial<Sale>) => {
  const response = await apiClient.post('/sales/', data);
  return response.data;
};

export const deleteSale = async (id: string) => {
  const response = await apiClient.delete(`/sales/${id}`);
  return response.data;
};

import { apiClient } from '../axios';

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit_price: number;
  stock_quantity: number;
  min_stock_level: number;
  created_at: string;
  updated_at: string;
}

export const getInventory = async (): Promise<InventoryProduct[]> => {
  const response = await apiClient.get('/inventory/');
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const createProduct = async (data: Partial<InventoryProduct>) => {
  const response = await apiClient.post('/inventory/', data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await apiClient.delete(`/inventory/${id}`);
  return response.data;
};

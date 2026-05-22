import axios from '../axios';

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

export const getInventory = async () => {
  const response = await axios.get('/inventory/');
  return response.data.data;
};

export const createProduct = async (data: Partial<InventoryProduct>) => {
  const response = await axios.post('/inventory/', data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await axios.delete(`/inventory/${id}`);
  return response.data;
};

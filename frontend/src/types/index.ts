export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'hr' | 'employee';
  org_id?: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
}

export interface AuthState {
  user: User | null;
  organization: Organization | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, org?: Organization) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
}

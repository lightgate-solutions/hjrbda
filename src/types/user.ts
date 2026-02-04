export type User = {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  department: string | null;
  managerId: number | null;
  isManager: boolean;
};

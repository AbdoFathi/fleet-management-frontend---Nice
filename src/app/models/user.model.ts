export interface UserInfo {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string;
  roles: string[];
}
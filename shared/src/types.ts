export interface User {
  id: string;
  name: string;
  email: string;
  familyId: string;
  role: 'admin' | 'member';
}

export interface Family {
  id: string;
  name: string;
  createdAt: string;
}
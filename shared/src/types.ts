import type { REMINDER_OPTIONS, SHOPPING_CATEGORIES } from "./constants";
import type { MEAL_TYPES } from './constants';

export type UserRole = 'parent' | 'child';
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_owner: boolean;
  currency: string;
  language: string;
  week_start_day: number | null;
  avatar_url: string | null;
  disabled_modules: string[];
}

export interface Family {
  id: string;
  name: string;
  createdAt: string;
}
export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  color: string;
  birthdate: string | null;
  allergies: string[];
  medications: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyMemberInput {
  name: string;
  role?: string;
  birthdate?: string;
  color?: string;
  allergies?: string[];
  medications?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export type UpdateFamilyMemberInput = Partial<CreateFamilyMemberInput>;

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  frequency: string | null;
  priority: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
  frequency?: string;
  priority?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  frequency?: string;
  priority?: string;
}

export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  byPriority: {
    High: number;
    Medium: number;
    Low: number;
  };
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  price: number | null;
  category: (typeof SHOPPING_CATEGORIES)[number];
  notes: string | null;
  checked: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  member_id: string | null;
  color: string;
  reminder_minutes: (typeof REMINDER_OPTIONS)[number] | null;
}


export interface MealPlan {
  id: string;
  date: string;
  meal_type: (typeof MEAL_TYPES)[number];
  custom_meal: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateMealPlanInput {
  date: string;
  meal_type: (typeof MEAL_TYPES)[number];
  custom_meal?: string;
  notes?: string;
}

export type UpdateMealPlanInput = Partial<CreateMealPlanInput>;

export type BudgetEntryType = 'expense' | 'income';

export interface BudgetTransaction {
  id: string;
  type: BudgetEntryType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

export interface CreateBudgetTransactionInput {
  type: BudgetEntryType;
  amount: number;
  category: string;
  description?: string;
  date?: string;
}

export interface BudgetCategorySummary {
  category: string;
  spent: number;
  limit: number | null;
}

export interface BudgetSummary {
  month: string;
  income: number;
  expenses: number;
  balance: number;
  byCategory: BudgetCategorySummary[];
}
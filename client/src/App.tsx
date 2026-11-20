import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { TasksPage } from './pages/TasksPage'
import { LoginPage } from './pages/LoginPage'
import { CalendarPage } from './pages/CalendarPage'
import { ShoppingListPage } from './pages/ShoppingListPage'
import { FamilyPage } from './pages/FamilyPage'
import { MealPlanningPage } from './pages/MealPlanningPage'
import { BudgetPage } from './pages/BudgetPage'
import { NotesPage } from './pages/NotesPage'
import { RewardsPage } from './pages/RewardsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/shopping" element={<ShoppingListPage />} />
              <Route path="/meals" element={<MealPlanningPage />} />
              <Route path="/Family" element={<FamilyPage />} />              
              <Route path="*" element={<Navigate to="/" replace />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/rewards" element={<RewardsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { CalendarPage } from '@/pages/CalendarPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DemandDetailPage } from '@/pages/DemandDetailPage';
import { EditDemandPage, NewDemandPage } from '@/pages/DemandFormPage';
import { DemandsPage } from '@/pages/DemandsPage';
import { ExportPage } from '@/pages/ExportPage';
import { LoginPage } from '@/pages/LoginPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { RoutinesPage } from '@/pages/RoutinesPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="demandas" element={<DemandsPage />} />
          <Route path="demandas/nova" element={<NewDemandPage />} />
          <Route path="demandas/:id" element={<DemandDetailPage />} />
          <Route path="demandas/:id/editar" element={<EditDemandPage />} />
          <Route path="rotinas" element={<RoutinesPage />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="exportar" element={<ExportPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

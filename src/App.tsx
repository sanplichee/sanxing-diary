import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppShell } from '@/components/AppShell';
import { HomePage } from '@/pages/HomePage';
import { GridDetailPage } from '@/pages/GridDetailPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toast } from '@/components/Toast';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ThemeProvider>
          <div className="app-container">
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/grid/:date/:cellId" element={<GridDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toast />
          </div>
        </ThemeProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;

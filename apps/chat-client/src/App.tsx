import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate} from 'react-router-dom';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/toast';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import PublicChatPage from './pages/PublicChatPage';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredType?: string }> = ({
  children,
  requiredType
}) => {
  const { user } = useChat();
  let localUser = null;
  try {
    const userString = localStorage.getItem('userInfo');
    if (userString) localUser = JSON.parse(userString);
  } catch {
    localStorage.removeItem('userInfo');
  }
  const currentUser = user || localUser;

  if (!currentUser) return <Navigate to="/login" replace />;
  if (requiredType && currentUser.type !== requiredType) {
    if (requiredType === "1" && currentUser.type === "0") return <Navigate to="/chat" replace />;
    if (requiredType === "0" && currentUser.type === "1") return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const DefaultRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useChat();
  let localUser = null;
  try {
    const userString = localStorage.getItem('userInfo');
    if (userString) localUser = JSON.parse(userString);
  } catch {
    localStorage.removeItem('userInfo');
  }
  const currentUser = user || localUser;

  useEffect(() => {
    if (!currentUser) navigate('/login');
    else if (currentUser.type === '1') navigate('/admin');
    else navigate('/chat');
  }, [currentUser, navigate]);

  return null;
};

function AppRoutes() {
  return (
    <Router basename="/chat/">
      <div className="h-screen w-full overflow-hidden">
        <Routes>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
          <Route path="/public" element={<PublicChatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chat" element={
            <ProtectedRoute requiredType="0">
              <ChatPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requiredType="1">
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;

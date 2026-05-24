import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
import ArticleList from './pages/ArticleList';
import ArticleEdit from './pages/ArticleEdit';

function Private({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Private>
              <Layout />
            </Private>
          }
        >
          <Route index element={<Navigate to="/articles" replace />} />
          <Route path="articles" element={<ArticleList />} />
          <Route path="articles/new" element={<ArticleEdit />} />
          <Route path="articles/:id" element={<ArticleEdit />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
import ArticleList from './pages/ArticleList';
import ArticleEdit from './pages/ArticleEdit';
function Private({ children }) {
    return getToken() ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
export default function App() {
    return (_jsx(HashRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsxs(Route, { path: "/", element: _jsx(Private, { children: _jsx(Layout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/articles", replace: true }) }), _jsx(Route, { path: "articles", element: _jsx(ArticleList, {}) }), _jsx(Route, { path: "articles/new", element: _jsx(ArticleEdit, {}) }), _jsx(Route, { path: "articles/:id", element: _jsx(ArticleEdit, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}

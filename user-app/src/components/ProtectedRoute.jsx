import { Navigate, Outlet } from 'react-router-dom';
import { getUserToken } from '../lib/session';
export default function ProtectedRoute(){return getUserToken()?<Outlet/>:<Navigate to="/login" replace/>}

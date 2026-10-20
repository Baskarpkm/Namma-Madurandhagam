import { Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import { shouldShowWelcome } from '../lib/session';

export default function HomeEntry(){
  return shouldShowWelcome()?<Navigate to="/welcome" replace/>:<HomePage/>;
}

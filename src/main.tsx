// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// CSS Globales
import './index.css'
import './styles/global.css'

// Importa TODAS tus pantallas
import AuthScreen from './pages/AuthScreen';
import LevelSelect from './pages/LevelSelect';
import QuizScreen from './pages/QuizScreen';
import Leaderboard from './pages/Leaderboard'; // <-- ¡AÑADE ESTA LÍNEA!
import ProfileScreen from './pages/ProfileScreen'; // <-- ¡AÑADE ESTA LÍNEA!

// Define tus "rutas"
const router = createBrowserRouter([
  {
    path: "/", 
    element: <AuthScreen />, 
  },
  {
    path: "/levels", 
    element: <LevelSelect />,
  },
  {
    path: "/quiz/:missionId", 
    element: <QuizScreen />, 
  },
  {
    path: "/leaderboard", // <-- ¡AÑADE ESTE BLOQUE!
    element: <Leaderboard />,
  },
    {
    path: "/profilescreen", // <-- ¡AÑADE ESTE BLOQUE!
    element: <ProfileScreen />,
  },
]);

// Inicia la aplicación (sin cambios)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
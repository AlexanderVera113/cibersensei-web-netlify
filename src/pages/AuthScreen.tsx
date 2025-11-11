// src/pages/AuthScreen.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './AuthScreen.css'; 

const AuthScreen: React.FC = () => {
  const navigate = useNavigate();

  // Estados (sin cambios)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  // Lógica de Registro (sin cambios, ya es robusta)
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    setError(null);

    if (isLoginView) {
      // --- LÓGICA DE INICIAR SESIÓN ---
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        navigate('/levels');
      }
    } else {
      // --- LÓGICA DE REGISTRARSE ---
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("No se pudo crear el usuario.");
        setLoading(false);
        return;
      }

      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        setError(selectError.message);
        setLoading(false);
        return;
      }

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: authData.user.id, 
            username: username, // Esta línea sigue usando la variable 'username'
          });
        
        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return; 
        }
      }
      navigate('/levels');
    }
    
    setLoading(false);
  };

  // --- Renderizado (MODIFICADO) ---
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">CiberSensei</h1>
        <h2 className="auth-subtitle">
          {isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        <form onSubmit={handleAuthAction} className="auth-form">
          {!isLoginView && (
            <input 
              type="text"
              placeholder="Nombre de Usuario"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off" // <-- ¡ARREGLO AÑADIDO!
            />
          )}

          <input 
            type="email"
            placeholder="email@ejemplo.com"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off" // <-- ¡ARREGLO AÑADIDO!
          />
          <input 
            type="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="off" // <-- ¡ARREGLO AÑADIDO!
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Cargando...' : (isLoginView ? 'Entrar' : 'Registrarse')}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <button 
          onClick={() => setIsLoginView(!isLoginView)} 
          className="auth-toggle"
        >
          {isLoginView 
            ? '¿No tienes cuenta? Regístrate' 
            : '¿Ya tienes cuenta? Inicia Sesión'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
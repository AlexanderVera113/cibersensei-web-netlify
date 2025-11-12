// src/pages/LevelSelect.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';
import './LevelSelect.css'; 

// Importamos el fondo de montañas
import levelSelectBackground from '../assets/backgrounds/bg-levels.png'; //

// Interfaz (sin cambios)
interface MissionInfo {
  id: string;
  level: number;
  title: string; 
  type: string;
}
interface UserProfile {
  username: string;
  xp: number;
}


const LevelSelect: React.FC = () => {
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); 

  // Carga el perfil del usuario Y las misiones
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // 1. Obtener el ID del usuario (esencial)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("No hay usuario logueado:", authError);
        setError("No estás autenticado.");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000); 
        return;
      }

      // 2. Preparar todas las consultas (sin cambios)
      const fetchMissions = supabase
        .from('missions')
        .select('id, level, type, payload->title')
        .order('level', { ascending: true });

      const fetchProfile = supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const fetchStats = supabase
        .from('user_stats')
        .select('xp')
        .eq('user_id', user.id)
        .single();

      // 3. Ejecutar todas las consultas en paralelo (sin cambios)
      const [missionsResult, profileResult, statsResult] = await Promise.all([
        fetchMissions,
        fetchProfile,
        fetchStats
      ]);

      // --- ¡AQUÍ ESTÁ EL ARREGLO! ---
      // 4. Procesar misiones
      if (missionsResult.error) {
        console.error('Error cargando misiones:', missionsResult.error);
        setError('No se pudieron cargar los niveles.');
      } else if (missionsResult.data) {
        
        const formattedData = missionsResult.data.map(mission => ({
          id: mission.id,
          level: mission.level,
          type: mission.type,
          // ¡ARREGLO! Forzamos el 'title' a ser un 'string'
          title: String(mission.title || 'Nivel sin título') 
        }));
        
        setMissions(formattedData); // Esta era la línea 86 que fallaba
      }
      // --- FIN DEL ARREGLO ---

      // 5. Procesar perfil y puntaje (sin cambios)
      if (profileResult.error) {
        console.error('Error cargando perfil:', profileResult.error);
        setError('No se pudo cargar tu perfil.');
      } else {
        const userXP = statsResult.data?.xp || 0;
        setProfile({
          username: profileResult.data?.username || 'Sensei',
          xp: userXP
        });
      }
      
      setLoading(false);
    };

    fetchData();
  }, [navigate]); 
  
  // Función de Clic (sin cambios)
  const handleLevelClick = (levelId: string) => {
    console.log('Navegando al quiz:', levelId);
    navigate(`/quiz/${levelId}`);
  };

  // Función de Cerrar Sesión (sin cambios)
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error);
      alert(error.message);
    } else {
      navigate('/');
    }
  };


  // --- Renderizado (sin cambios) ---
  if (loading) {
    return <div className="loading-screen">Cargando Niveles...</div>;
  }
  if (error) {
    return <div className="error-screen">{error}</div>;
  }

  return (
    <div 
      className="level-select-container"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${levelSelectBackground})`
      }}
    >
      
      {profile && (
        <div className="profile-bar">
          <button 
            className="profile-info-button"
            onClick={() => navigate('/profile')} 
          >
            <span className="profile-username">@{profile.username}</span>
            <span className="profile-xp">{profile.xp} XP</span>
          </button>
          <div className="profile-actions">
            <button 
              className="leaderboard-button" 
              onClick={() => navigate('/leaderboard')}
            >
              Ranking
            </button>
            <button 
              className="logout-button"
              onClick={handleLogout}
            >
              Salir
            </button>
          </div>
        </div>
      )}

      <h1 className="level-select-title">CiberSensei</h1>
      <h2 className="level-select-subtitle">Selección de Misión</h2>

      <div className="level-list">
        {missions.map((mission) => (
          <button 
            key={mission.id}
            className={`level-button type-${mission.type.toLowerCase()}`}
            onClick={() => handleLevelClick(mission.id)}
          >
            <span className="level-number">Nivel {mission.level}</span>
            <span className="level-title">{mission.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelect;
// src/pages/LevelSelect.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';
import './LevelSelect.css'; 

import levelSelectBackground from '../assets/backgrounds/bg-levels.png';

// Interfaces
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

// --- CONFIGURACIÓN DE ETAPAS (RANGOS NUEVOS) ---
const STAGES = [
  { 
    title: 'Fundamentos (Básico)', 
    min: 1, max: 8, // Niveles 1 al 8
    testLevel: 9,   // Prueba Nivel 9
    style: 'basico' 
  },
  { 
    title: 'Amenazas (Intermedio)', 
    min: 10, max: 17, // Niveles 10 al 17
    testLevel: 18,    // Prueba Nivel 18
    style: 'intermedio' 
  },
  { 
    title: 'Defensa (Difícil)', 
    min: 19, max: 26, // Niveles 19 al 26
    testLevel: 27,    // Prueba Nivel 27
    style: 'dificil' 
  },
  { 
    title: 'Hacking Ético (Experto)', 
    min: 28, max: 35, // Niveles 28 al 35
    testLevel: 36,    // Prueba Nivel 36
    style: 'experto' 
  },
  { 
    title: 'Ciberseguridad Total (Master)', 
    min: 37, max: 44, // Niveles 37 al 44
    testLevel: 45,    // Prueba Nivel 45
    style: 'master' 
  },
];

const LevelSelect: React.FC = () => {
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("No hay usuario logueado:", authError);
        setError("No estás autenticado.");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000); 
        return;
      }

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

      const [missionsResult, profileResult, statsResult] = await Promise.all([
        fetchMissions,
        fetchProfile,
        fetchStats
      ]);

      if (missionsResult.error) {
        console.error('Error cargando misiones:', missionsResult.error);
        setError('No se pudieron cargar los niveles.');
      } else if (missionsResult.data) {
        const formattedData = missionsResult.data.map(mission => ({
          id: mission.id,
          level: mission.level,
          type: mission.type,
          title: String(mission.title || 'Nivel sin título') 
        }));
        setMissions(formattedData);
      }

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
  
  const handleLevelClick = (levelId: string) => {
    navigate(`/quiz/${levelId}`);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(error.message);
    } else {
      navigate('/');
    }
  };


  if (loading) { return <div className="loading-screen">Cargando Niveles...</div>; }
  if (error) { return <div className="error-screen">{error}</div>; }

  return (
    <div 
      className="level-select-container"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${levelSelectBackground})`
      }}
    >
      
      {/* --- Barra de Perfil --- */}
      {profile && (
        <div className="profile-bar">
          <button className="profile-info-button" onClick={() => navigate('/profile')}>
            <span className="profile-username">@{profile.username}</span>
            <span className="profile-xp">{profile.xp} XP</span>
          </button>
          <div className="profile-actions">
            <button className="leaderboard-button" onClick={() => navigate('/leaderboard')}>Ranking</button>
            <button className="logout-button" onClick={handleLogout}>Salir</button>
          </div>
        </div>
      )}

      <h1 className="level-select-title">CiberSensei</h1>
      <h2 className="level-select-subtitle">Selección de Misión</h2>

      <div className="level-list">
        {/* --- RENDERIZADO POR RANGOS --- */}
        {STAGES.map((stage) => {
          
          // 1. Filtrar misiones dentro del RANGO (min a max)
          const stageMissions = missions.filter(m => m.level >= stage.min && m.level <= stage.max);
          
          // 2. Buscar la prueba de ascenso específica
          const testMission = missions.find(m => m.level === stage.testLevel);

          if (stageMissions.length === 0 && !testMission) return null;

          return (
            <div key={stage.title} className={`stage-section stage-${stage.style}`}>
              <h3 className="stage-title">{stage.title}</h3>
              
              {/* Lista de Niveles Normales */}
              <div className="stage-grid">
                {stageMissions.map((mission) => (
                  <button 
                    key={mission.id}
                    className={`level-button normal type-${stage.style}`}
                    onClick={() => handleLevelClick(mission.id)}
                  >
                    {/* Mostramos el número real del nivel */}
                    <span className="level-number">{mission.level}</span>
                    <span className="level-title-small">{mission.title}</span>
                  </button>
                ))}
              </div>

              {/* Prueba de Ascenso */}
              {testMission && (
                <button 
                  className={`level-button boss type-${stage.style}`}
                  onClick={() => handleLevelClick(testMission.id)}
                >
                  <span className="boss-icon">💀</span>
                  <div className="boss-info">
                    <span className="boss-label">PRUEBA DE ASCENSO</span>
                    <span className="boss-title">{testMission.title}</span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LevelSelect;
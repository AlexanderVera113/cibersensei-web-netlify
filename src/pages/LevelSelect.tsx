// src/pages/LevelSelect.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';
import './LevelSelect.css'; 

// Importamos el fondo de montañas (Asegúrate de que sea .jpg si ese es el archivo que tienes)
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

// --- CONFIGURACIÓN DE ETAPAS ---
const STAGES = [
  { title: 'Fundamentos (Básico)', min: 1, max: 8, testLevel: 9, style: 'basico' },
  { title: 'Amenazas (Intermedio)', min: 10, max: 17, testLevel: 18, style: 'intermedio' },
  { title: 'Defensa (Difícil)', min: 19, max: 26, testLevel: 27, style: 'dificil' },
  { title: 'Hacking Ético (Experto)', min: 28, max: 35, testLevel: 36, style: 'experto' },
  { title: 'Ciberseguridad Total (Master)', min: 37, max: 44, testLevel: 45, style: 'master' },
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

      // 1. Usuario
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("No hay usuario logueado:", authError);
        setError("No estás autenticado.");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000); 
        return;
      }

      // 2. Consultas
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

      // 3. Procesar resultados
      if (missionsResult.error) {
        console.error('Error cargando misiones:', missionsResult.error);
        setError('No se pudieron cargar los niveles.');
      } else if (missionsResult.data) {
        
        // --- ¡CORRECCIÓN AQUÍ! ---
        // Convertimos explícitamente 'title' a String para evitar el error TS2345
        const formattedData = missionsResult.data.map(mission => ({
          id: mission.id,
          level: mission.level,
          type: mission.type,
          title: String(mission.title || 'Nivel sin título') 
        }));
        // -------------------------

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
        {STAGES.map((stage) => {
          const stageMissions = missions.filter(m => m.level >= stage.min && m.level <= stage.max);
          const testMission = missions.find(m => m.level === stage.testLevel);

          if (stageMissions.length === 0 && !testMission) return null;

          return (
            <div key={stage.title} className={`stage-section stage-${stage.style}`}>
              <h3 className="stage-title">{stage.title}</h3>
              
              <div className="stage-grid">
                {stageMissions.map((mission) => (
                  <button 
                    key={mission.id}
                    className={`level-button normal type-${stage.style}`}
                    onClick={() => handleLevelClick(mission.id)}
                  >
                    <span className="level-number">{mission.level}</span>
                    <span className="level-title-small">{mission.title}</span>
                  </button>
                ))}
              </div>

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
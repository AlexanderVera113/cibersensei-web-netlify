// src/pages/LevelSelect.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';
import './LevelSelect.css'; 

// Fondo
import levelSelectBackground from '../assets/backgrounds/bg-levels.png';
// Video
import introVideoUrl from '../assets/videos/Cibersensei_Modulo_1.mp4';

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

// Configuración de Etapas
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
  
  // Estado para controlar el bloqueo
  // Empieza en 1, así el Nivel 1 siempre está abierto
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
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

      // Consultas
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

      // ¡IMPORTANTE! Consultamos el progreso para saber qué desbloquear
      const fetchProgress = supabase
        .rpc('get_max_completed_level', { user_id_input: user.id });

      const [missionsResult, profileResult, statsResult, progressResult] = await Promise.all([
        fetchMissions,
        fetchProfile,
        fetchStats,
        fetchProgress
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

      // Procesar Progreso
      if (progressResult.error) {
        console.error('Error cargando progreso:', progressResult.error);
        // Si falla, por defecto dejamos abierto solo el 1
        setUnlockedLevel(1);
      } else {
        const maxCompleted = progressResult.data || 0;
        // El nivel desbloqueado es siempre el siguiente al completado
        setUnlockedLevel(maxCompleted + 1);
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
    if (error) { alert(error.message); } else { navigate('/'); }
  };

  const handleWatchVideo = () => {
    setShowVideo(true);
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
      
      {/* Barra de Perfil */}
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

      {/* Modal de Video */}
      {showVideo && (
        <div className="video-modal-overlay">
          <div className="video-modal-content">
            <button className="close-video-button" onClick={() => setShowVideo(false)}>
              X CERRAR
            </button>
            <video controls autoPlay className="intro-video-player">
              <source src={introVideoUrl} type="video/mp4" />
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
        </div>
      )}

      <h1 className="level-select-title">CiberSensei</h1>
      <h2 className="level-select-subtitle">Selección de Misión</h2>

      <div className="level-list">
        
        <div className="video-intro-section">
          <button className="video-intro-button" onClick={handleWatchVideo}>
            📺 Ver Introducción al Curso
          </button>
        </div>

        {/* RENDERIZADO POR ETAPAS CON BLOQUEO */}
        {STAGES.map((stage) => {
          const stageMissions = missions.filter(m => m.level >= stage.min && m.level <= stage.max);
          const testMission = missions.find(m => m.level === stage.testLevel);

          if (stageMissions.length === 0 && !testMission) return null;

          return (
            <div key={stage.title} className={`stage-section stage-${stage.style}`}>
              <h3 className="stage-title">{stage.title}</h3>
              
              <div className="stage-grid">
                {stageMissions.map((mission) => {
                  // Lógica de Bloqueo: Si el nivel de la misión es mayor al desbloqueado
                  const isLocked = mission.level > unlockedLevel;

                  return (
                    <button 
                      key={mission.id}
                      className={`level-button normal type-${stage.style} ${isLocked ? 'locked' : ''}`}
                      // Solo permite clic si NO está bloqueado
                      onClick={() => !isLocked && handleLevelClick(mission.id)}
                      disabled={isLocked}
                    >
                      {isLocked ? (
                        <span className="locked-icon">🔒</span>
                      ) : (
                        <>
                          <span className="level-number">{mission.level}</span>
                          <span className="level-title-small">{mission.title}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {testMission && (() => {
                const isBossLocked = testMission.level > unlockedLevel;
                return (
                  <button 
                    className={`level-button boss type-${stage.style} ${isBossLocked ? 'locked' : ''}`}
                    onClick={() => !isBossLocked && handleLevelClick(testMission.id)}
                    disabled={isBossLocked}
                  >
                    {isBossLocked ? (
                      <span className="boss-icon">🔒</span>
                    ) : (
                      <span className="boss-icon">💀</span>
                    )}
                    <div className="boss-info">
                      <span className="boss-label">PRUEBA DE ASCENSO</span>
                      <span className="boss-title">
                        {isBossLocked ? "Bloqueado" : testMission.title}
                      </span>
                    </div>
                  </button>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LevelSelect;
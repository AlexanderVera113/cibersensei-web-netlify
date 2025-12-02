// src/pages/LevelSelect.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';
import './LevelSelect.css'; 

// Fondo
import levelSelectBackground from '../assets/backgrounds/bg-levels.webp';

// --- IMPORTACIÓN DE VIDEOS ---
import introVideoUrl1 from '../assets/videos/Cibersensei_Modulo_1.mp4';
// Asegúrate de tener este archivo, o usa el 1 como prueba
import introVideoUrl2 from '../assets/videos/Cibersensei_Modulo_2.mp4'; 

// Icono
import introIconImg from '../assets/icon/content.png'; 

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
  { 
    title: 'Fundamentos (Básico)', 
    min: 1, max: 8, testLevel: 9, style: 'basico',
    introVideo: introVideoUrl1,
    videoTitle: 'Introducción: Fundamentos'
  },
  { 
    title: 'Amenazas (Intermedio)', 
    min: 10, max: 17, testLevel: 18, style: 'intermedio',
    introVideo: introVideoUrl2, // Aquí iría el video 2 cuando lo tengas
    videoTitle: 'Introducción: Phishing'
  },
  { 
    title: 'Defensa (Difícil)', 
    min: 19, max: 26, testLevel: 27, style: 'dificil' 
  },
  { title: 'Hacking Ético (Experto)', min: 28, max: 35, testLevel: 36, style: 'experto' },
  { title: 'Ciberseguridad Total (Master)', min: 37, max: 44, testLevel: 45, style: 'master' },
];

const LevelSelect: React.FC = () => {
  const [missions, setMissions] = useState<MissionInfo[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controlar QUÉ video se está reproduciendo
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

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

      if (progressResult.error) {
        console.error('Error cargando progreso:', progressResult.error);
        setUnlockedLevel(1);
      } else {
        const maxCompleted = progressResult.data || 0;
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

  // --- FUNCIONES DEL MODAL ---
  const openVideo = (url: string) => {
    setActiveVideo(url); // Establece el video y abre el modal
  };

  const closeVideo = () => {
    setActiveVideo(null); // Cierra el modal
  };
  // --------------------------


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
          <button className="profile-info-button" onClick={() => navigate('/ProfileScreen')}>
            <span className="profile-username">@{profile.username}</span>
            <span className="profile-xp">{profile.xp} XP</span>
          </button>
          <div className="profile-actions">
            <button className="leaderboard-button" onClick={() => navigate('/leaderboard')}>Ranking</button>
            <button className="logout-button" onClick={handleLogout}>Salir</button>
          </div>
        </div>
      )}

      {/* --- MODAL DE VIDEO DINÁMICO --- */}
      {/* Solo se muestra si 'activeVideo' tiene una URL */}
      {activeVideo && (
        <div className="video-modal-overlay">
          <div className="video-modal-content">
            <button className="close-video-button" onClick={closeVideo}>
              X CERRAR
            </button>
            
            <video controls autoPlay className="intro-video-player">
              {/* La 'key' fuerza a React a recargar el video si cambia la URL */}
              <source key={activeVideo} src={activeVideo} type="video/mp4" />
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
        </div>
      )}
      {/* ------------------------------ */}

      <h1 className="level-select-title">CiberSensei</h1>
      <h2 className="level-select-subtitle">Selección de Misión</h2>

      <div className="level-list">
        
        {/* Renderizado de Etapas */}
        {STAGES.map((stage) => {
          const stageMissions = missions.filter(m => m.level >= stage.min && m.level <= stage.max);
          const testMission = missions.find(m => m.level === stage.testLevel);

          if (stageMissions.length === 0 && !testMission) return null;

          return (
            <div key={stage.title} className={`stage-section stage-${stage.style}`}>
              
              {/* Cabecera de Etapa con Botón de Video */}
              <div className="stage-header">
                <h3 className="stage-title">{stage.title}</h3>
                
                {stage.introVideo && (
                  <div className="video-intro-section">
                    <button 
                      className="video-intro-button" 
                      onClick={() => openVideo(stage.introVideo!)}
                    >
                      <img src={introIconImg} alt="Icono Intro" className="video-button-icon" />
                      <span>{stage.videoTitle || 'Ver Intro'}</span>
                    </button>
                  </div>
                )}
              </div>

              
              <div className="stage-grid">
                {stageMissions.map((mission) => {
                  const isLocked = mission.level > unlockedLevel;
                  return (
                    <button 
                      key={mission.id}
                      className={`level-button normal type-${stage.style} ${isLocked ? 'locked' : ''}`}
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
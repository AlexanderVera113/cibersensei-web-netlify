// src/pages/ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './ProfileScreen.css'; 

// --- Interfaces (Completas) ---
interface Badge { id: string; name: string; description: string; icon: string; }
interface UserBadge { badge_id: string; }
interface Attempt { mission_id: string; result: { correct: boolean; } | null }
interface UserStats {
  correct: number;
  incorrect: number;
  missionsCompleted: number;
  streak: number; 
  timeInvested: number; // Para "Minutos Jugados"
}
interface Friend {
  user_id: string; 
  username: string;
  status: 'pending' | 'accepted' | 'blocked';
  is_requester: boolean; 
  streak: number; // Para "Racha entre Amigos"
}
interface SearchUser { id: string; username: string; }
// --- Fin de Interfaces ---

type ProfileTab = 'stats' | 'badges' | 'friends';


const ProfileScreen: React.FC = () => {
  // --- Estados (Completos) ---
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const navigate = useNavigate();

  // --- useEffect (Carga Secuencial) ---
  const loadProfileData = async () => {
    try {
      // 1. Obtener el ID del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Usuario no encontrado. Volviendo al login...");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      setCurrentUserId(user.id);

      // --- 2. Carga de Medallas ---
      const { data: userBadgesData, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id') 
        .eq('user_id', user.id);
      if (userBadgesError) throw userBadgesError;

      const { data: allBadgesData, error: allBadgesError } = await supabase
        .from('badges')
        .select('id, name, description, icon');
      if (allBadgesError) throw allBadgesError;

      const userBadgeIds = new Set(
        userBadgesData.map((badge: UserBadge) => badge.badge_id)
      );
      const finalBadgeList = allBadgesData.filter((badge: Badge) => 
        userBadgeIds.has(badge.id)
      );
      setUserBadges(finalBadgeList);
      // --- Fin Carga de Medallas ---


      // --- 3. Carga de Estadísticas (Completa) ---
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select('mission_id, result') 
        .eq('user_id', user.id); 
      if (attemptsError) throw attemptsError;

      const { data: streakData, error: streakError } = await supabase
        .rpc('get_daily_streak', { user_id_input: user.id });
      if (streakError) throw streakError;
      
      const { data: playtimeData, error: playtimeError } = await supabase
        .rpc('get_total_playtime_minutes', { user_id_input: user.id });
      if (playtimeError) throw playtimeError;

      // Procesa los intentos
      let correctCount = 0;
      let incorrectCount = 0;
      const completedMissionIds = new Set<string>();
      
      attemptsData.forEach((attempt: Attempt) => {
        if (attempt.result && attempt.result.correct === true) { 
          correctCount++;
          completedMissionIds.add(attempt.mission_id); 
        } else {
          incorrectCount++;
        }
      });

      setUserStats({ 
        correct: correctCount, 
        incorrect: incorrectCount,
        missionsCompleted: completedMissionIds.size,
        streak: streakData || 0,
        timeInvested: playtimeData || 0 
      });
      // --- Fin Carga de Estadísticas ---

      // --- 4. Carga de Amigos ---
      const { data: friendsData, error: friendsError } = await supabase.rpc('get_all_friends'); 
      if (friendsError) throw friendsError;
      setFriends(friendsData as Friend[]);
      // --- Fin Carga de Amigos ---

    } catch (error: any) {
      console.error('Error cargando datos del perfil:', error);
      setError(`No se pudieron cargar tus datos: ${error.message}`);
    }
    
    // 5. Pone setLoading(false) al final de todo
    setLoading(false);
  };
  
  useEffect(() => {
    setLoading(true); 
    setError(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    
    loadProfileData(); 
  }, [navigate]); 


  // --- Funciones de Amigos (Completas) ---
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUserId) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${searchQuery}%`) 
        .neq('id', currentUserId)
        .limit(5); 

      if (error) throw error;
      if (data.length === 0) {
        setSearchError('No se encontraron usuarios con ese nombre.');
      } else {
        setSearchResults(data);
      }
    } catch (error: any) {
      setSearchError(error.message);
    }
    setSearchLoading(false);
  };

  const handleAddFriend = async (receiverId: string) => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: currentUserId,
          receiver_id: receiverId,
          status: 'pending' 
        });
      
      if (error) {
        if (error.code === '23505') { 
          setSearchError('Error: Ya has enviado una solicitud a este usuario.');
        } else {
          throw error;
        }
      } else {
        alert('¡Solicitud de amistad enviada!');
        setSearchResults([]);
        setSearchQuery('');
        loadProfileData(); 
      }
    } catch (error: any) {
      setSearchError(`Error al añadir amigo: ${error.message}`);
    }
  };

  const handleFriendRequest = async (requesterId: string, accept: boolean) => {
    if (!currentUserId) return;

    try {
      if (accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('requester_id', requesterId) 
          .eq('receiver_id', currentUserId); 
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('requester_id', requesterId)
          .eq('receiver_id', currentUserId);
        if (error) throw error;
      }
      loadProfileData(); 
    } catch (error: any) {
      alert(`Error al responder a la solicitud: ${error.message}`);
    }
  };
  
  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUserId) return;

    if (!window.confirm("¿Estás seguro de que quieres eliminar a este amigo?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${currentUserId})`);
      
      if (error) throw error;

      loadProfileData(); 

    } catch (error: any) {
      alert(`Error al eliminar amigo: ${error.message}`);
    }
  };
  // --- FIN DE FUNCIONES DE AMIGOS ---


  // --- Renderizado de Pestañas ---
  const renderActiveTab = () => {
    if (loading) return <div className="loading-screen">Cargando...</div>;
    if (error) return <div className="error-screen">{error}</div>;

    switch (activeTab) {
      // --- PESTAÑA 1: ESTADÍSTICAS ---
      case 'stats':
        return (
          <div className="profile-section">
            <h2 className="profile-subtitle">Mis Estadísticas</h2>
            {userStats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{userStats.streak} 🔥</span>
                  <span className="stat-label">Racha Diaria</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{userStats.missionsCompleted}</span>
                  <span className="stat-label">Misiones</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{userStats.timeInvested}</span>
                  <span className="stat-label">Minutos Jugados</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{userStats.correct}</span>
                  <span className="stat-label">Aciertos</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{userStats.incorrect}</span>
                  <span className="stat-label">Fallos</span>
                </div>
                <div className="stat-card empty"></div>
              </div>
            )}
          </div>
        );
      
      // --- PESTAÑA 2: MEDALLERO ---
      case 'badges':
        return (
          <div className="profile-section">
            <h2 className="profile-subtitle">Mi Medallero</h2>
            {userBadges.length === 0 && (
              <p className="profile-empty-text">
                Aún no has ganado ninguna medalla. ¡Sigue jugando!
              </p>
            )}
            <div className="badge-grid">
              {userBadges.map((badge) => (
                <div key={badge.id} className="badge-card">
                  <span className="badge-icon">{badge.icon}</span>
                  <span className="badge-name">{badge.name}</span>
                  <span className="badge-description">{badge.description}</span>
                </div>
              ))}
            </div>
          </div>
        );

      // --- PESTAÑA 3: AMIGOS ---
      case 'friends':
        const pendingRequests = friends.filter(f => f.status === 'pending' && !f.is_requester);
        const acceptedFriends = friends.filter(f => f.status === 'accepted');
        const sentRequests = friends.filter(f => f.status === 'pending' && f.is_requester);

        return (
          <div className="profile-section">
            
            <h2 className="profile-subtitle">Añadir Amigo</h2>
            <form className="friend-search-form" onSubmit={handleSearchUsers}>
              <input
                type="text"
                placeholder="Buscar por @username..."
                className="friend-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="friend-search-button" disabled={searchLoading}>
                {searchLoading ? '...' : 'Buscar'}
              </button>
            </form>
            {searchLoading && <div className="loading-screen">Buscando...</div>}
            {searchError && <p className="error-text">{searchError}</p>}
            <div className="search-results-list">
              {searchResults.map((user) => (
                <div key={user.id} className="search-result-row">
                  <span>@{user.username}</span>
                  <button 
                    className="add-friend-button"
                    onClick={() => handleAddFriend(user.id)}
                  >
                    Añadir
                  </button>
                </div>
              ))}
            </div>
            
            {pendingRequests.length > 0 && (
              <>
                <h2 className="profile-subtitle">Solicitudes Pendientes</h2>
                <div className="friend-list">
                  {pendingRequests.map((friend) => (
                    <div key={friend.user_id} className="friend-card pending">
                      <span className="friend-username">@{friend.username}</span>
                      <div className="friend-actions">
                        <button 
                          className="friend-button accept"
                          onClick={() => handleFriendRequest(friend.user_id, true)}
                        >
                          Aceptar
                        </button>
                        <button 
                          className="friend-button decline"
                          onClick={() => handleFriendRequest(friend.user_id, false)}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h2 className="profile-subtitle">Mis Amigos</h2>
            {acceptedFriends.length === 0 && (
              <p className="profile-empty-text">
                Aún no tienes amigos.
              </p>
            )}
            <div className="friend-list">
              {acceptedFriends.map((friend) => (
                <div key={friend.user_id} className="friend-card">
                  <span className="friend-username">@{friend.username}</span>
                  <div className="friend-actions">
                    <span className="friend-streak">{friend.streak} 🔥</span>
                    <button 
                      className="friend-button decline"
                      onClick={() => handleRemoveFriend(friend.user_id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {sentRequests.length > 0 && (
              <>
                <h2 className="profile-subtitle">Solicitudes Enviadas</h2>
                <div className="friend-list">
                  {sentRequests.map((friend) => (
                    <div key={friend.user_id} className="friend-card">
                      <span className="friend-username">@{friend.username}</span>
                      <span className={`friend-status status-pending`}>
                        Pendiente
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // --- ¡ESTE ES EL JSX QUE FALTABA! ---
  return (
    <div className="profile-container">
      <button onClick={() => navigate('/levels')} className="back-button-profile">
        &lt; Volver al Mapa
      </button>

      <h1 className="profile-title">Mi Perfil</h1>

      {/* --- Navegación por Pestañas --- */}
      <div className="profile-tabs">
        <button
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Estadísticas
        </button>
        <button
          className={`tab-button ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          Medallero
        </button>
        <button
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Amigos
        </button>
      </div>
      
      {/* Contenido de la pestaña activa */}
      {renderActiveTab()}
      
    </div>
  );
};

export default ProfileScreen;
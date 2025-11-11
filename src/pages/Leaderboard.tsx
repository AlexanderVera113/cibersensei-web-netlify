// src/pages/Leaderboard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Leaderboard.css'; // Crearemos este archivo a continuación

// Interfaz para los datos del leaderboard
// Coincide con tu captura de pantalla
interface LeaderboardEntry {
  user_id: string;
  username: string;
  xp: number;
}

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      // 1. Consulta tu vista 'vw_leaderboard'
      // 2. Selecciona 'user_id', 'username', 'xp'
      // 3. Ordena por 'xp' de forma descendente (el más alto primero)
      // 4. Limita a los 10 mejores
      const { data, error } = await supabase
        .from('vw_leaderboard')
        .select('user_id, username, xp')
        .order('xp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error cargando el leaderboard:', error);
        setError('No se pudo cargar la tabla de posiciones.');
      } else if (data) {
        setEntries(data as LeaderboardEntry[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []); // El [] asegura que se ejecute solo una vez

  return (
    <div className="leaderboard-container">
      {/* Botón para volver al mapa de niveles */}
      <button onClick={() => navigate('/levels')} className="back-button-leaderboard">
        &lt; Volver al Mapa
      </button>

      <h1 className="leaderboard-title">Leaderboard</h1>

      {loading && <div className="loading-screen">Cargando...</div>}
      {error && <div className="error-screen">{error}</div>}

      <div className="leaderboard-list">
        {entries.map((entry, index) => (
          <div key={entry.user_id} className="leaderboard-row">
            <span className="leaderboard-rank">#{index + 1}</span>
            <span className="leaderboard-username">{entry.username}</span>
            <span className="leaderboard-xp">{entry.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
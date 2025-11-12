// src/pages/QuizScreen.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient'; 
import './QuizScreen.css';

// --- Tus importaciones de Personajes y Fondos ---
import charBasico from '../assets/characters/bg-cat.png';
import charIntermedio from '../assets/characters/bg-panda.png';
import charDificil from '../assets/characters/bg-alien.png';
import charExperto from '../assets/characters/bg-necro.png';
import charMaster from '../assets/characters/bg-cyber.png';
import bgBasico from '../assets/backgrounds/bg-cat-fondo.png';
import bgIntermedio from '../assets/backgrounds/bg-panda-fondo.png';
import bgDificil from '../assets/backgrounds/bg-alien-fondo.png';
import bgExperto from '../assets/backgrounds/bg-necro-fondo.png';
import bgMaster from '../assets/backgrounds/bg-cyber-fondo.png';

// --- Mapas de Assets ---
const characterMap: { [key: string]: string } = {
  'Basico': charBasico,
  'Intermedio': charIntermedio,
  'dificil': charDificil,
  'Experto': charExperto,
  'Master': charMaster,
};
const backgroundMap: { [key: string]: string } = {
  'Basico': bgBasico,
  'Intermedio': bgIntermedio,
  'dificil': bgDificil,
  'Experto': bgExperto,
  'Master': bgMaster,
};

// --- Interfaces ---
interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}
interface QuizPayload {
  title: string;
  choices: Choice[];
  scoring: { points: number; };
  time_ms: number;
  question: string;
}
interface Mission {
  id: string;
  level: number;
  type: string; 
  payload: QuizPayload;
}


// --- El Componente ---
const QuizScreen: React.FC = () => {
  const { missionId } = useParams(); 
  const navigate = useNavigate();

  // --- Estados ---
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null); 
  const [feedback, setFeedback] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState(false);

  
  // --- useEffect (La versión que sí funciona) ---
  useEffect(() => {
    const loadQuizData = async () => {
      setLoading(true);
      setError(null);
      setCurrentMission(null);
      setSelectedOptionId(null);
      setFeedback('');
      setIsAnswered(false);

      if (!missionId) {
        setError('No se ha especificado ninguna misión.');
        setLoading(false);
        return;
      }
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("Usuario no logueado:", authError);
        setError("No estás autenticado. Volviendo al login...");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      setCurrentUserId(user.id);

      // Carga la misión
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId) 
        .limit(1)
        .single(); 

      if (missionError) {
        console.error('Error cargando la misión:', missionError);
        setError(`No se pudo cargar la misión: ${missionError.message}`);
        setLoading(false);
        return;
      }
      
      if (!missionData) {
        setError('Misión no encontrada. (ID no existe)');
        setLoading(false);
        return;
      }

      // Configura la pantalla
      const mission = missionData as Mission;
      setCurrentMission(mission);
      const missionType = mission.type; 
      const charImgSrc = characterMap[missionType];
      setCharacterImage(charImgSrc || charBasico); 
      const backgroundImgSrc = backgroundMap[missionType]; 
      setBackgroundImage(backgroundImgSrc || bgBasico); 
      
      setLoading(false);
    };
    loadQuizData();
  }, [missionId, navigate]); 


  // --- Función 1: Seleccionar Opción (sin cambios) ---
  const handleOptionClick = (option: Choice) => {
    if (isAnswered) return;
    setSelectedOptionId(option.id);
    setFeedback('');
  };

  // --- Función 2: Enviar Respuesta (La versión que sí funciona) ---
  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isAnswered || !currentMission || !currentUserId) return;
    setIsAnswered(true);

    const chosenChoice = currentMission.payload.choices.find(
      (c) => c.id === selectedOptionId
    );
    if (!chosenChoice) return; 

    const isCorrect = chosenChoice.isCorrect;
    const pointsToAdd = isCorrect ? currentMission.payload.scoring.points : 0;

    // --- Lógica de 'attempts' (Guarda el intento para las medallas) ---
    const attemptResult = {
      correct: isCorrect,
      score: pointsToAdd
    };
    
    const { error: attemptError } = await supabase
      .from('attempts')
      .insert({
          user_id: currentUserId,
          mission_id: currentMission.id,
          finished_at: new Date().toISOString(), // Guarda la hora de fin
          result: attemptResult 
      });

    if (attemptError) {
      console.error('Error al guardar el intento:', attemptError);
    }
    // --- FIN DEL BLOQUE DE 'ATTEMPTS' ---


    // PASO 2: Actualiza el XP (sin cambios)
    if (isCorrect) {
      const { error: rpcError } = await supabase.rpc('increment_xp', {
        user_id_input: currentUserId,
        xp_to_add: pointsToAdd
      });

      if (rpcError) {
        console.error('Error al guardar puntaje:', rpcError);
        setFeedback(`¡Correcto! (+ ${pointsToAdd} pts) [Error al guardar]`);
      } else {
        setFeedback(`¡Correcto! (+ ${pointsToAdd} pts)`);
      }
    } else {
      const correctChoice = currentMission.payload.choices.find(c => c.isCorrect);
      setFeedback(`Incorrecto. La respuesta era: (${correctChoice?.id.toUpperCase()})`);
    }
  };

  // --- Función 3: Volver al Mapa (sin cambios) ---
  const handleGoBack = () => {
    navigate('/levels');
  };

  // --- Función 4: Siguiente Misión (sin cambios) ---
  const handleNextMission = async () => {
    if (!currentMission) return;
    const nextLevel = currentMission.level + 1;
    
    const { data, error } = await supabase
      .from('missions')
      .select('id')
      .eq('level', nextLevel)
      .limit(1)
      .single();

    if (error || !data) {
      alert('¡Felicidades! ¡Has completado este camino! Volviendo al mapa.');
      navigate('/levels');
    } else {
      navigate(`/quiz/${data.id}`);
    }
  };


  // --- Renderizado (sin cambios) ---
  if (loading) { return <div className="loading-screen">Cargando Misión...</div>; }
  if (error) { return <div className="error-screen">{error}</div>; }
  if (!currentMission) { return <div className="error-screen">Misión no encontrada.</div>; }

  return (
    <div 
      className="quiz-container" 
      style={{ 
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none' 
      }}
    >
      
      <div className="character-area">
        {characterImage && (
          <img src={characterImage} alt="CiberSensei" className="character-sprite" />
        )}
      </div>

      <div className="quiz-box">
        <p className="question-text">{currentMission.payload.question}</p>
        
        <div className="options-grid">
          {currentMission.payload.choices.map((choice) => (
            <button 
              key={choice.id} 
              className="option-button"
              onClick={() => handleOptionClick(choice)}
              disabled={isAnswered}
              style={{
                borderColor: selectedOptionId === choice.id ? '#FFFF00' : '#0e3a53'
              }}
            >
              ({choice.id.toUpperCase()}) {choice.text}
            </button>
          ))}
        </div>

        {!isAnswered && (
          <button 
            className="submit-button"
            onClick={handleSubmitAnswer}
            disabled={!selectedOptionId} 
          >
            Responder
          </button>
        )}

        {feedback && (
          <div className="feedback-text" style={{ 
            color: feedback.startsWith('¡Correcto!') ? '#33ff33' : '#ff3333' 
          }}>
            {feedback}
          </div>
        )}

        {isAnswered && (
          <div className="post-answer-controls">
            <button onClick={handleGoBack} className="nav-button prev">
              &lt; Volver al Mapa
            </button>
            {feedback.startsWith('¡Correcto!') && (
              <button onClick={handleNextMission} className="nav-button next">
                Siguiente Misión &gt;
              </button>
            )}
          </div>
        )}

        <div className="level-title-bar">
          Nivel {currentMission.level} – {currentMission.payload.title}
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
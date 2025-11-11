// src/pages/QuizScreen.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient'; 
import './QuizScreen.css';

// --- Importaciones de Personajes y Fondos (Tus nombres de archivo) ---
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

// --- Mapas de Assets (sin cambios) ---
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

// --- Interfaces (sin cambios) ---
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
  
  // ID del intento actual para guardar el tiempo
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);

  // Estados del Quiz
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null); 
  const [feedback, setFeedback] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState(false);

  
  // --- useEffect (Con la lógica de 'started_at') ---
  useEffect(() => {
    const loadQuizData = async () => {
      setLoading(true);
      setError(null);
      setCurrentMission(null);
      setSelectedOptionId(null);
      setFeedback('');
      setIsAnswered(false);
      setCurrentAttemptId(null); 

      if (!missionId) {
        setError('No se ha especificado ninguna misión.');
        setLoading(false);
        return;
      }
      
      // 1. Obtener el ID del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("No estás autenticado. Volviendo al login...");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      setCurrentUserId(user.id);

      // 2. Cargar la Misión
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId) 
        .limit(1)
        .single(); 

      if (missionError || !missionData) {
        setError('Misión no encontrada o error al cargar.');
        setLoading(false);
        return;
      }

      // 3. Crear el "Intento" (Attempt) para registrar 'started_at'
      try {
        const { data: attemptData, error: attemptError } = await supabase
          .from('attempts')
          .insert({
              user_id: user.id,
              mission_id: missionData.id,
              started_at: new Date().toISOString() // ¡Hora de inicio!
          })
          .select('id') 
          .single();
        
        if (attemptError) throw attemptError;
        
        setCurrentAttemptId(attemptData.id); // ¡Guarda el ID del intento!

      } catch (attemptError: any) {
        console.error('Error al crear el intento:', attemptError);
        setError('Error al iniciar la misión. Revisa los permisos RLS de INSERT en attempts.');
        setLoading(false);
        return;
      }

      // 4. Configurar la pantalla
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


  // --- ¡FUNCIONES CORREGIDAS (con '=>')! ---

  const handleOptionClick = (option: Choice) => {
    if (isAnswered) return;
    setSelectedOptionId(option.id);
    setFeedback('');
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isAnswered || !currentMission || !currentUserId || !currentAttemptId) {
      return;
    }
    setIsAnswered(true);

    const chosenChoice = currentMission.payload.choices.find(
      (c) => c.id === selectedOptionId
    );
    if (!chosenChoice) return; 

    const isCorrect = chosenChoice.isCorrect;
    const pointsToAdd = isCorrect ? currentMission.payload.scoring.points : 0;

    // --- Lógica de 'attempts' (UPDATE) ---
    const attemptResult = {
      correct: isCorrect,
      score: pointsToAdd
    };
    
    const { error: attemptError } = await supabase
      .from('attempts')
      .update({
          finished_at: new Date().toISOString(), // ¡Hora de fin!
          result: attemptResult
      })
      .eq('id', currentAttemptId); // Actualiza la fila correcta

    if (attemptError) {
      console.error('Error al actualizar el intento:', attemptError);
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

  const handleGoBack = () => {
    navigate('/levels');
  };

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
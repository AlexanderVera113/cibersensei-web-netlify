// src/pages/QuizScreen.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient'; 
import './QuizScreen.css';

// --- Importaciones de Personajes ---
import charBasico from '../assets/characters/bg-cat.png';
import charIntermedio from '../assets/characters/bg-panda.png';
import charDificil from '../assets/characters/bg-alien.png';
import charExperto from '../assets/characters/bg-necro.png';
import charMaster from '../assets/characters/bg-cyber.png';

// --- Importaciones de Fondos ---
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

// --- Configuración de Progresión ---
const LEVEL_TO_TEST_MAP: { [key: number]: number } = {
  8: 9, 17: 18, 26: 27, 35: 36, 44: 45
};
const TEST_TO_NEXT_LEVEL_MAP: { [key: number]: number } = {
  9: 10, 18: 19, 27: 28, 36: 37
};


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
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null); 
  const [feedback, setFeedback] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState(false);

  
  // --- useEffect ---
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
      
      // 1. Autenticación (CORREGIDO: Quitamos 'authError' que no se usaba)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError("No estás autenticado. Volviendo al login...");
        setLoading(false);
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      setCurrentUserId(user.id);

      // 2. Cargar Misión
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId) 
        .limit(1)
        .single(); 

      if (missionError || !missionData) {
        console.error("Error al cargar misión:", missionError);
        setError('Misión no encontrada.');
        setLoading(false);
        return;
      }

      // 3. Crear Intento
      try {
        const { data: attemptData, error: attemptError } = await supabase
          .from('attempts')
          .insert({
              user_id: user.id,
              mission_id: missionData.id,
              started_at: new Date().toISOString()
          })
          .select('id') 
          .single();
        
        if (attemptError) throw attemptError;
        setCurrentAttemptId(attemptData.id); 

      } catch (attemptError: any) {
        console.error('Error al crear el intento:', attemptError);
      }

      // 4. Configurar UI
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


  // --- Funciones ---

  const handleOptionClick = (option: Choice) => {
    if (isAnswered) return;
    setSelectedOptionId(option.id);
    setFeedback('');
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || isAnswered || !currentMission || !currentUserId || !currentAttemptId) return;
    setIsAnswered(true);

    const chosenChoice = currentMission.payload.choices.find(
      (c) => c.id === selectedOptionId
    );
    if (!chosenChoice) return; 

    const isCorrect = chosenChoice.isCorrect;
    const pointsToAdd = isCorrect ? currentMission.payload.scoring.points : 0;

    // Actualizar Intento
    const attemptResult = {
      correct: isCorrect,
      score: pointsToAdd
    };
    
    const { error: updateError } = await supabase
      .from('attempts')
      .update({
          finished_at: new Date().toISOString(),
          result: attemptResult
      })
      .eq('id', currentAttemptId);

    if (updateError) console.error("Error actualizando intento:", updateError);

    // Actualizar XP
    if (isCorrect) {
      await supabase.rpc('increment_xp', {
        user_id_input: currentUserId,
        xp_to_add: pointsToAdd
      });
      setFeedback(`¡Correcto! (+ ${pointsToAdd} pts)`);
    } else {
      const correctChoice = currentMission.payload.choices.find(c => c.isCorrect);
      setFeedback(`Incorrecto. La respuesta era: (${correctChoice?.id.toUpperCase()})`);
    }
  };

  const handleGoBack = () => {
    navigate('/levels');
  };

  // --- Lógica de Progresión ---
  const handleNextMission = async () => {
    if (!currentMission || !currentUserId) return;
    setLoading(true); 

    const { data: attemptsData } = await supabase
      .from('attempts')
      .select('mission_id')
      .eq('user_id', currentUserId);
      
    const completedSet = new Set(attemptsData?.map(a => a.mission_id));
    completedSet.add(currentMission.id); 

    const { data: levelMissions } = await supabase
      .from('missions')
      .select('id')
      .eq('level', currentMission.level);

    const nextInSameLevel = levelMissions?.find(m => !completedSet.has(m.id));

    if (nextInSameLevel) {
      navigate(`/quiz/${nextInSameLevel.id}`);
      return;
    }

    let nextLevelTarget: number | null = null;

    if (LEVEL_TO_TEST_MAP[currentMission.level]) {
      nextLevelTarget = LEVEL_TO_TEST_MAP[currentMission.level];
    } else if (TEST_TO_NEXT_LEVEL_MAP[currentMission.level]) {
      nextLevelTarget = TEST_TO_NEXT_LEVEL_MAP[currentMission.level];
    } else {
      nextLevelTarget = currentMission.level + 1;
    }
    
    const { data: nextLevelMission } = await supabase
      .from('missions')
      .select('id')
      .eq('level', nextLevelTarget)
      .limit(1)
      .single();

    if (nextLevelMission) {
      navigate(`/quiz/${nextLevelMission.id}`);
    } else {
      alert('¡Nivel completado! Volviendo al mapa.');
      navigate('/levels');
    }
    
    setLoading(false);
  };


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
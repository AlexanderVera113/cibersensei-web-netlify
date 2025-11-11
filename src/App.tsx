// src/App.tsx
// import QuizScreen from './pages/QuizScreen'; // Ya no usamos esta por ahora
import LevelSelect from './pages/LevelSelect'; // ¡Importa la nueva pantalla!

function App() {
  return (
    <div className="App">
      {/* ¡Muestra la pantalla de Selección de Nivel! */}
      <LevelSelect />
    </div>
  )
}

export default App
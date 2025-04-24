import "./App.css";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Header from "./components/header/Header";
import { games } from "./data/games";
import { useTranslation } from "react-i18next";

function App() {
  const location = useLocation();

  return (
    <div
      className={`app_container ${
        location.pathname === "/" ? "home_layout" : ""
      }`}
    >
      <Header />
      <Routes>
        <Route path="/" element={<GameSelection />} />
        {games.map((game) => (
          <Route key={game.id} path={`/${game.id}`} element={game.component} />
        ))}
      </Routes>
    </div>
  );
}

function GameSelection() {
  const { t } = useTranslation();
  return (
    <div className="game_selection">
      {games.map((game) => (
        <Link key={game.id} to={`/${game.id}`}>
          <button className={`${game.id}_button select_game_button`}>
            {t(`${game.id}.name`)}
          </button>
        </Link>
      ))}
    </div>
  );
}

export default App;

import "./App.css";
import "./Common.css";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
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
      <main>
        <Routes>
          <Route path="/" element={<GameSelection />} />
          {games
            .filter((game) => game.available)
            .map((game) => (
              <Route
                key={game.id}
                path={`/${game.id}`}
                element={game.component}
              />
            ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function GameSelection() {
  const { t } = useTranslation();

  return (
    <div className="game_selection">
      {games.map((game) => {
        const isAvailable = game.available;
        const classes = `${game.id}_button select_game_button ${
          isAvailable ? "" : "game_unavailable"
        }`;

        const button = (
          <button
            className={classes}
            disabled={!isAvailable}
            title={!isAvailable ? t("common.availableSoon") : undefined}
          >
            {t(`${game.id}.name`)}
          </button>
        );

        return isAvailable ? (
          <Link key={game.id} to={`/${game.id}`}>
            {button}
          </Link>
        ) : (
          <div key={game.id}>{button}</div>
        );
      })}
    </div>
  );
}

export default App;

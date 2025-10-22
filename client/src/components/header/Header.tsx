import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { games } from "../../data/games";
import { languages } from "../../data/languages";
import { useTranslation } from "react-i18next";
import { FaSun, FaMoon, FaAngleDown, FaAngleUp } from "react-icons/fa";
import "./Header.css";
const projectName = import.meta.env.VITE_PROJECT_NAME;

export default function Header() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getPreferredTheme = () =>
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const currentId = location.pathname.slice(1);
  const currentGame = games.find((g) => g.id === currentId) ?? null;
  const gameName = currentGame?.name ?? null;

  return (
    <header className="header">
      <div
        className={
          gameName === null
            ? "empty-space-header-show"
            : "empty-space-header-hide"
        }
      ></div>
      <Link
        to="/"
        className={`header-title ${gameName === null ? "center" : "left"}`}
      >
        {projectName}
      </Link>

      {gameName && (
        <div className="header-game">
          <div>{currentGame && t(`${currentGame.id}.name`)}</div>
        </div>
      )}

      <div className="header-controls">
        {gameName && (
          <Link to="/" className="header-back">
            {t("header.menu")}
          </Link>
        )}
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? <FaMoon /> : <FaSun />}
        </button>
        <div className="language-selector" ref={dropdownRef}>
          <button
            className="lang-toggle-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="lang-text">{i18n.language.toUpperCase()}</span>
            <span className="lang-icon">
              {dropdownOpen ? <FaAngleUp /> : <FaAngleDown />}
            </span>
          </button>
          {dropdownOpen && (
            <ul className="lang-dropdown">
              {languages.map((lang) => (
                <li key={lang.code}>
                  <button
                    className={`lang-option ${
                      i18n.language === lang.code ? "active" : ""
                    }`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setDropdownOpen(false);
                    }}
                  >
                    {lang.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}

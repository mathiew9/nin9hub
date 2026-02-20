import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { games } from "../../data/games";
import { languages } from "../../data/languages";
import { useTranslation } from "react-i18next";
import {
  FaSun,
  FaMoon,
  FaAngleDown,
  FaAngleUp,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import "./Header.css";

const projectName = import.meta.env.VITE_PROJECT_NAME;
const MOBILE_BREAKPOINT = 600;

function useIsNarrow(breakpointPx: number) {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpointPx}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setIsNarrow(mq.matches);

    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpointPx]);

  return isNarrow;
}

export default function Header() {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const isNarrow = useIsNarrow(MOBILE_BREAKPOINT);

  // language dropdown (desktop + mobile)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // burger menu (mobile)
  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);

  const fireExitOnline = useCallback(() => {
    window.dispatchEvent(new Event("ninehub:exit-online"));
  }, []);

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

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  const currentId = location.pathname.slice(1);
  const currentGame = games.find((g) => g.id === currentId) ?? null;
  const hasGame = !!currentGame;

  const titleText = useMemo(() => {
    // Mobile: affiche le jeu à gauche, sinon fallback projectName
    if (hasGame) return t(`games.${currentGame!.id}.name`);
    return projectName;
  }, [hasGame, currentGame, t]);

  // fermer dropdown/burger au changement de page
  useEffect(() => {
    setDropdownOpen(false);
    setBurgerOpen(false);
  }, [location.pathname]);

  // click outside (dropdown + burger)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (burgerRef.current && !burgerRef.current.contains(target)) {
        setBurgerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ESC pour fermer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setBurgerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      className={`header ${isNarrow ? "header--mobile" : "header--desktop"}`}
    >
      {/* ===== LEFT ===== */}
      {!isNarrow ? (
        <>
          {/* Desktop: ton layout actuel */}
          <div
            className={
              hasGame ? "empty-space-header-hide" : "empty-space-header-show"
            }
          />

          <Link
            to="/"
            onClick={fireExitOnline}
            className={`header-title ${hasGame ? "left" : "center"}`}
          >
            {projectName}
          </Link>

          {hasGame && (
            <div className="header-game">
              <div>{t(`games.${currentGame!.id}.name`)}</div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Mobile: à gauche = jeu (ou projet si pas de jeu) */}
          <div className="header-mobile-left">
            <div
              className={`header-mobile-title ${
                hasGame
                  ? "header-mobile-title--game"
                  : "header-mobile-title--project"
              }`}
            >
              {titleText}
            </div>
          </div>
        </>
      )}

      {/* ===== RIGHT CONTROLS ===== */}
      <div className="header-controls">
        {/* Desktop: bouton Menu visible (comme avant) */}
        {!isNarrow && hasGame && (
          <Link to="/" className="header-back" onClick={fireExitOnline}>
            {t("header.menu")}
          </Link>
        )}

        {/* Thème: visible en desktop, ET visible en mobile UNIQUEMENT sur le menu principal (pas de jeu) */}
        {(!isNarrow || !hasGame) && (
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <FaMoon /> : <FaSun />}
          </button>
        )}

        {/* Lang selector (toujours visible) */}
        <div className="language-selector" ref={dropdownRef}>
          <button
            className="lang-toggle-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            aria-label="Change language"
          >
            <span className="lang-text">{i18n.language.toUpperCase()}</span>
            <span className="lang-icon">
              {dropdownOpen ? <FaAngleUp /> : <FaAngleDown />}
            </span>
          </button>

          {dropdownOpen && (
            <ul className="lang-dropdown" role="menu">
              {languages.map((lang) => (
                <li key={lang.code} role="none">
                  <button
                    role="menuitem"
                    className={`lang-option ${i18n.language === lang.code ? "active" : ""}`}
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

        {/* Burger: seulement en mobile ET seulement quand on est dans un jeu */}
        {isNarrow && hasGame && (
          <div className="header-burger" ref={burgerRef}>
            <button
              className="burger-btn"
              onClick={() => setBurgerOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={burgerOpen}
              aria-haspopup="menu"
            >
              {burgerOpen ? <FaTimes /> : <FaBars />}
            </button>

            {burgerOpen && (
              <div className="burger-panel" role="menu">
                <div className="burger-title">{projectName}</div>

                <div className="burger-actions">
                  <Link
                    to="/"
                    onClick={() => {
                      fireExitOnline();
                      setBurgerOpen(false);
                    }}
                    className="burger-item"
                    role="menuitem"
                  >
                    {t("header.menu")}
                  </Link>

                  <button
                    className="burger-item"
                    onClick={toggleTheme}
                    role="menuitem"
                  >
                    {t("common.actions.toggleTheme")}
                    {theme === "light" ? <FaMoon /> : <FaSun />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

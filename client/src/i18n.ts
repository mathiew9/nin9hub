import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpApi) // charge les fichiers JSON
  .use(LanguageDetector) // détecte la langue de l'utilisateur
  .use(initReactI18next) // connecte à React
  .init({
    fallbackLng: "en", // langue par défaut si rien détecté
    debug: true,
    interpolation: {
      escapeValue: false, // React échappe déjà les valeurs
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json", // chemin vers les fichiers
    },
  });

export default i18n;

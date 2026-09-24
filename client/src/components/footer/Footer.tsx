import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="appFooter">
      <div className="footerSection">© {currentYear} Nin9hub</div>
      <div className="footerSection">Version {__APP_VERSION__}</div>
    </footer>
  );
}

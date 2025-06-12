import "./Footer.css";

export default function Footer() {
  return (
    <footer className="appFooter">
      <div className="footerSection">© 2025 Ninehub</div>
      <div className="footerSection">Version {__APP_VERSION__}</div>
    </footer>
  );
}

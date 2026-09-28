import logo from "../../../packages/ui/src/assets/emeris-logo.svg";
import "./splash.css";

export function Splash() {
  return (
    <main className="splash" role="status" aria-live="polite">
      <img src={logo} alt="Emeris" />
      <h1>Emeris Pulse</h1>
    </main>
  );
}

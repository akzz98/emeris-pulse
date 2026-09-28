import logo from "../../../packages/ui/src/assets/emeris-logo.svg";
import "./splash.css";

export function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <img src={logo} alt="Emeris" />
      <p>Emeris Pulse</p>
    </div>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { setupFirebase } from "./store";
import { getEnvFirebaseConfig } from "./firebase";
import { getStoredFirebaseConfig } from "./components/FirebaseSetup";

(function initFirebaseEarly() {
  const envConfig = getEnvFirebaseConfig();
  if (envConfig) { setupFirebase(envConfig); return; }
  const stored = getStoredFirebaseConfig();
  if (stored?.apiKey && stored?.databaseURL) setupFirebase(stored);
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

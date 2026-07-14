import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// Self-hosted type (latin subsets): Fraunces for display, Newsreader for the
// letter voice, Inter for interface labels.
import "@fontsource/fraunces/latin-500.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-400-italic.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";

import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

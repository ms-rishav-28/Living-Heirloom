import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InterviewFlow from "./pages/InterviewFlow";
import GenerationPage from "./pages/GenerationPage";
import CapsuleLibrary from "./pages/CapsuleLibrary";
import LetterView from "./pages/LetterView";
import NotFound from "./pages/NotFound";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/create" element={<InterviewFlow />} />
        <Route path="/generate" element={<GenerationPage />} />
        <Route path="/capsules" element={<CapsuleLibrary />} />
        <Route path="/letter/:id" element={<LetterView />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Clankovnice from "./pages/Clankovnice";
import Tipovacky from "./pages/Tipovacky";
import Fotosoutez from "./pages/Fotosoutez";
import Obchudek from "./pages/Obchudek";
import Admin from "./pages/Admin";
import Posta from "./pages/Posta";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PravidlaOchranaOU from "./pages/PravidlaOchranaOU";
import LvZJ from "./pages/LvZJ";
import DynamicPage from "./pages/DynamicPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/clankovnice" element={<Layout><Clankovnice /></Layout>} />
            <Route path="/tipovacky" element={<Layout><Tipovacky /></Layout>} />
            <Route path="/fotosoutez" element={<Layout><Fotosoutez /></Layout>} />
            <Route path="/obchudek" element={<Layout><Obchudek /></Layout>} />
            <Route path="/admin" element={<Layout><Admin /></Layout>} />
            <Route path="/pravidla-ochrana-ou" element={<Layout><PravidlaOchranaOU /></Layout>} />
            <Route path="/lvzj" element={<Layout><LvZJ /></Layout>} />
            <Route path="/posta" element={<Layout><Posta /></Layout>} />
            <Route path="/u/:username" element={<Layout><Profile /></Layout>} />
            <Route path="/:slug" element={<Layout><DynamicPage /></Layout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

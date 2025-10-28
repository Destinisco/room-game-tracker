import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import Dashboard from "./pages/Dashboard";
import RoomDetail from "./pages/RoomDetail";
import SessionDetail from "./pages/SessionDetail";
import Tablet from "./pages/Tablet";
import TabletSession from "./pages/TabletSession";
import Login from "./pages/Login";
import SetupAdmin from "./pages/SetupAdmin";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/" element={<AuthGuard allowedRoles={["admin"]}><Dashboard /></AuthGuard>} />
          <Route path="/rooms/:id" element={<AuthGuard allowedRoles={["admin"]}><RoomDetail /></AuthGuard>} />
          <Route path="/sessions/:id" element={<AuthGuard allowedRoles={["admin"]}><SessionDetail /></AuthGuard>} />
          <Route path="/admin/users" element={<AuthGuard allowedRoles={["admin"]}><AdminUsers /></AuthGuard>} />
          <Route path="/tablet" element={<AuthGuard allowedRoles={["admin", "editor"]}><Tablet /></AuthGuard>} />
          <Route path="/tablet/session/:id" element={<AuthGuard allowedRoles={["admin", "editor"]}><TabletSession /></AuthGuard>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

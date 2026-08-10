import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import AdminAgents from "./pages/AdminAgents";
import AdminAgentSummary from "./pages/AdminAgentSummary";
import AdminAgentTemplates from "./pages/AdminAgentTemplates";
import AdminMcpRegistry from "./pages/AdminMcpRegistry";
import AdminModelRegistry from "./pages/AdminModelRegistry";
import AdminReviewSummary from "./pages/AdminReviewSummary";
import AdminSkillHubRegistry from "./pages/AdminSkillHubRegistry";
import AdminStats from "./pages/AdminStats";
import AdminUsers from "./pages/AdminUsers";
import AdminUserSummary from "./pages/AdminUserSummary";
import AgentDetail from "./pages/AgentDetail";
import Browse from "./pages/Browse";
import Login from "./pages/Login";
import MyAgents from "./pages/MyAgents";
import ReviewDetail from "./pages/ReviewDetail";
import ReviewQueue from "./pages/ReviewQueue";
import Reviews from "./pages/Reviews";
import Skills from "./pages/Skills";
import SsoCallback from "./pages/SsoCallback";
import VersionDetail from "./pages/VersionDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sso/callback" element={<SsoCallback />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Browse />} />
        <Route path="/my-agents" element={<MyAgents />} />
        <Route path="/agents/:slug" element={<AgentDetail />} />
        <Route path="/agents/:agentSlug/versions/:versionSlug" element={<VersionDetail />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/reviews/:reviewId" element={<ReviewDetail />} />
        <Route path="/review-queue" element={<ReviewQueue />} />
        <Route
          path="/admin/review-summary"
          element={
            <ProtectedRoute requireAdmin>
              <AdminReviewSummary />
            </ProtectedRoute>
          }
        />
        <Route path="/skills" element={<Skills />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agents"
          element={
            <ProtectedRoute requireAdmin>
              <AdminAgents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user-summary"
          element={
            <ProtectedRoute requireAdmin>
              <AdminUserSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agent-summary"
          element={
            <ProtectedRoute requireAdmin>
              <AdminAgentSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agent-templates"
          element={
            <ProtectedRoute requireAdmin>
              <AdminAgentTemplates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/mcp-registry"
          element={
            <ProtectedRoute requireAdmin>
              <AdminMcpRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/model-registry"
          element={
            <ProtectedRoute requireAdmin>
              <AdminModelRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/skillhub-registry"
          element={
            <ProtectedRoute requireAdmin>
              <AdminSkillHubRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <ProtectedRoute requireAdmin>
              <AdminStats />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

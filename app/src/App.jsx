import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import LoginModal from './components/LoginModal.jsx'
import Toaster from './components/Toaster.jsx'
import PresenceBeat from './components/PresenceBeat.jsx'
import PageFade from './components/PageFade.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import HomePage from './pages/HomePage.jsx'
import UseCaseLibraryPage from './pages/UseCaseLibraryPage.jsx'
import QuestionsPage from './pages/QuestionsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AdminConsolePage from './pages/AdminConsolePage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import MessagesPage from './pages/MessagesPage.jsx'
import NoAccessPage from './pages/NoAccessPage.jsx'
import MaintenanceGate from './components/MaintenanceGate.jsx'

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <PageFade>
            <MaintenanceGate>
            <Routes>
              <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
              <Route path="/use-cases" element={<RequireAuth><UseCaseLibraryPage /></RequireAuth>} />
              <Route path="/use-cases/:id" element={<RequireAuth><UseCaseLibraryPage /></RequireAuth>} />
              <Route path="/questions" element={<RequireAuth><QuestionsPage /></RequireAuth>} />
              <Route path="/questions/:id" element={<RequireAuth><QuestionsPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              {/* "Chat với Admin": a person's conversation with the admins; for admins, their shared inbox */}
              <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
              {/* "Tin nhắn": one-to-one conversations between people (?to=<user id> opens one) */}
              <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
              {/* review page for a submitted use case: admins comment, the author replies (others get "not found") */}
              <Route path="/review/:id" element={<RequireAuth><ReviewPage /></RequireAuth>} />
              {/* hidden — no nav link, direct URL only; has its own login + admin-role gate */}
              <Route path="/admin" element={<AdminConsolePage />} />
              {/* where sign-in sends someone Microsoft doesn't list under Zalopay: ask the admins for access */}
              <Route path="/no-access" element={<NoAccessPage />} />
            </Routes>
            </MaintenanceGate>
          </PageFade>
          <LoginModal />
          <Toaster />
          <PresenceBeat />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

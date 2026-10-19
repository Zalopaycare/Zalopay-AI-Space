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

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <PageFade>
            <Routes>
              <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
              <Route path="/use-cases" element={<RequireAuth><UseCaseLibraryPage /></RequireAuth>} />
              <Route path="/use-cases/:id" element={<RequireAuth><UseCaseLibraryPage /></RequireAuth>} />
              <Route path="/questions" element={<RequireAuth><QuestionsPage /></RequireAuth>} />
              <Route path="/questions/:id" element={<RequireAuth><QuestionsPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              {/* review page for a submitted use case: admins comment, the author replies (others get "not found") */}
              <Route path="/review/:id" element={<RequireAuth><ReviewPage /></RequireAuth>} />
              {/* hidden — no nav link, direct URL only; has its own login + admin-role gate */}
              <Route path="/admin" element={<AdminConsolePage />} />
            </Routes>
          </PageFade>
          <LoginModal />
          <Toaster />
          <PresenceBeat />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

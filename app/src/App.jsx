import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import LoginModal from './components/LoginModal.jsx'
import PageFade from './components/PageFade.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import HomePage from './pages/HomePage.jsx'
import UseCaseLibraryPage from './pages/UseCaseLibraryPage.jsx'
import QuestionsPage from './pages/QuestionsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AdminConsolePage from './pages/AdminConsolePage.jsx'

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
              <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              {/* hidden — no nav link, direct URL only; has its own login + admin-role gate */}
              <Route path="/admin" element={<AdminConsolePage />} />
            </Routes>
          </PageFade>
          <LoginModal />
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

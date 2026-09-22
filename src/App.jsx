import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { I18nProvider } from './i18n/I18nContext.jsx'
import PageFade from './components/PageFade.jsx'
import HomePage from './pages/HomePage.jsx'
import UseCaseLibraryPage from './pages/UseCaseLibraryPage.jsx'
import QuestionsPage from './pages/QuestionsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import AdminConsolePage from './pages/AdminConsolePage.jsx'

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <PageFade>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/use-cases" element={<UseCaseLibraryPage />} />
            <Route path="/use-cases/:id" element={<UseCaseLibraryPage />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* hidden — no nav link, direct URL only, matching the source design */}
            <Route path="/admin" element={<AdminConsolePage />} />
          </Routes>
        </PageFade>
      </BrowserRouter>
    </I18nProvider>
  )
}

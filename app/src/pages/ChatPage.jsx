import Layout from '../components/Layout.jsx'
import { MyChat } from '../components/AdminChat.jsx'
import { css } from '../lib/style.js'
import { useI18n } from '../i18n/I18nContext.jsx'

// "Chat với Admin": everyone's own conversation with the admin team, admins included.
// Admins answer from the inbox in the Admin Console (/admin → Hộp thư).
export default function ChatPage() {
  const { t } = useI18n()
  return (
    <Layout active="chat">
      <div className="zp-chat-page">
        <MyChat t={t} />
      </div>
    </Layout>
  )
}

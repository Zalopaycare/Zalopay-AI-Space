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
        <div style={css('margin-bottom:12px;')}>
          <h1 style={css('margin:0; font-size:22px; font-weight:800; letter-spacing:-.4px; color:#fff;')}>{t('Chat với Admin')}</h1>
          <p style={css('margin:4px 0 0; font-size:13px; color:#a9b8dc;')}>{t('Nhắn trực tiếp cho đội Admin AI Space: hỏi đáp, góp ý, báo lỗi.')}</p>
        </div>
        <MyChat t={t} />
      </div>
    </Layout>
  )
}

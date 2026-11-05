export default function AdminFeedback({ action }) {
  return <>{action.error && <p className="admin-error" role="alert">{action.error}</p>}{action.notice && <p className="admin-notice" role="status">{action.notice}</p>}</>
}

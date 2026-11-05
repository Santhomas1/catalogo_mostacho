import { useId } from 'react'
export function Field({ label, multiline = false, children, ...props }) {
  const id = useId()
  return <label className="admin-field" htmlFor={id}><span>{label}</span>{children ? <select id={id} {...props}>{children}</select> : multiline ? <textarea id={id} rows={4} {...props} /> : <input id={id} {...props} />}</label>
}
export function Check({ label, ...props }) {
  const id = useId()
  return <label className="admin-check" htmlFor={id}><input id={id} type="checkbox" {...props} /><span>{label}</span></label>
}

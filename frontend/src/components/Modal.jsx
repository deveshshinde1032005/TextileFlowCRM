export default function Modal({ title, onClose, children, size = '' }) {
  return <div className="modal-backdrop-custom" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal-card ${size}`}>
      <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><i className="bi bi-x-lg"/></button></div>
      <div className="modal-body-custom">{children}</div>
    </div>
  </div>;
}

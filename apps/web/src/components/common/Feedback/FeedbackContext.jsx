import { createContext, useCallback, useContext, useState } from 'react';
import './Feedback.css';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [alertState, setAlertState] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const confirm = useCallback(({ title = 'Confirmar acción', message, confirmLabel = 'Confirmar' }) => new Promise((resolve) => {
    setConfirmation({ title, message, confirmLabel, resolve });
  }), []);

  const alert = useCallback(({ title = 'Atención', message, confirmLabel = 'Aceptar' }) => new Promise((resolve) => {
    setAlertState({ title, message, confirmLabel, resolve });
  }), []);

  const closeConfirmation = (accepted) => {
    confirmation?.resolve(accepted);
    setConfirmation(null);
  };

  const closeAlert = () => {
    alertState?.resolve();
    setAlertState(null);
  };

  return <FeedbackContext.Provider value={{ notify, confirm, alert }}>
    {children}
    {notice && <div className={`app-notice app-notice--${notice.type}`} role="status">{notice.message}</div>}
    {confirmation && <div className="app-confirm-backdrop" role="presentation" onMouseDown={() => closeConfirmation(false)}>
      <section className="app-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="confirm-title">{confirmation.title}</h2>
        <p>{confirmation.message}</p>
        <div className="app-confirm-actions">
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => closeConfirmation(false)}>Cancelar</button>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => closeConfirmation(true)}>{confirmation.confirmLabel}</button>
        </div>
      </section>
    </div>}
    {alertState && <div className="app-alert-backdrop" role="presentation" onMouseDown={closeAlert}>
      <section className="app-alert-modal" role="dialog" aria-modal="true" aria-labelledby="alert-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="app-alert-icon" aria-hidden="true">!</div>
        <h2 id="alert-title">{alertState.title}</h2>
        <p>{alertState.message}</p>
        <div className="app-alert-actions">
          <button className="btn btn--primary btn--sm" type="button" onClick={closeAlert}>{alertState.confirmLabel}</button>
        </div>
      </section>
    </div>}
  </FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}

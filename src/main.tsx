import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { createRepository } from './storage';
import './styles.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="boot" role="alert">
          <h1>Algo salió mal</h1>
          <p>{this.state.error.message}</p>
          <p>Tus datos guardados no se modificaron. Recarga la página para continuar.</p>
          <button type="button" className="btn primary" onClick={() => window.location.reload()}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const repository = createRepository();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider repo={repository}>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);

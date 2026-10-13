import { Shell } from './components/Shell';
import { Toasts } from './components/Toasts';
import { useApp } from './context/AppContext';
import { BackupPage } from './pages/Backup';
import { CalculatorPage } from './pages/Calculator';
import { DashboardPage } from './pages/Dashboard';
import { FilamentsPage } from './pages/Filaments';
import { Onboarding } from './pages/Onboarding';
import { PrintView } from './pages/PrintView';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { ProjectsPage } from './pages/Projects';
import { SettingsPage } from './pages/Settings';
import { href, useRoute } from './router';

export default function App() {
  const { data } = useApp();
  const route = useRoute();

  let content;
  if (!data.settings.setupCompleted) {
    content = <Onboarding />;
  } else if (route.name === 'imprimir') {
    content = <PrintView key={`${route.id}-${route.kind}`} id={route.id} kind={route.kind} />;
  } else {
    let page;
    switch (route.name) {
      case 'panel': page = <DashboardPage />; break;
      case 'nuevo': page = <CalculatorPage key={route.editId ?? 'nuevo'} editId={route.editId} />; break;
      case 'proyectos': page = <ProjectsPage />; break;
      case 'proyecto': page = <ProjectDetailPage key={route.id} id={route.id} />; break;
      case 'filamentos': page = <FilamentsPage />; break;
      case 'configuracion': page = <SettingsPage />; break;
      case 'respaldo': page = <BackupPage />; break;
      default:
        page = (
          <div className="empty card">
            <h2>Página no encontrada</h2>
            <p>La dirección no existe.</p>
            <a className="btn primary" href={href('/nuevo')}>Ir a Nuevo cálculo</a>
          </div>
        );
    }
    content = <Shell route={route}>{page}</Shell>;
  }

  return (
    <>
      {content}
      <Toasts />
    </>
  );
}

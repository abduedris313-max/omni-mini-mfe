import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWAServiceWorker } from './hooks/useServiceWorker';

initPWAServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);

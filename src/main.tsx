import { createRoot } from 'react-dom/client';
import App from './App';
import {startInstallSupport} from './install';
startInstallSupport();
import './styles.css';
createRoot(document.getElementById('root')!).render(<App/>);

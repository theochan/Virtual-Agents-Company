import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { WorkspaceGate } from './components/WorkspaceGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceGate />
  </StrictMode>,
);

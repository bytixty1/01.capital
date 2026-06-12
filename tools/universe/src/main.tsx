import { createRoot } from 'react-dom/client';
import { UniverseGraph } from './universe/UniverseGraph';
import './styles.css';

// No StrictMode: react-force-graph-3d owns a WebGL canvas and we imperatively
// add lights/starfield/postprocessing to its scene; double-mounted effects
// would duplicate those scene objects.
createRoot(document.getElementById('root')!).render(<UniverseGraph />);

import { Routes, Route } from 'react-router-dom';
import { AuthorProvider } from './lib/author';
import { Header } from './components/Header';
import { ProjectsList } from './pages/ProjectsList';
import { ProjectNew } from './pages/ProjectNew';
import { ProjectDetail } from './pages/ProjectDetail';
import { CallNew } from './pages/CallNew';
import { CallDetail } from './pages/CallDetail';

export default function App() {
  return (
    <AuthorProvider>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<ProjectsList />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/calls/new" element={<CallNew />} />
          <Route path="/calls/:id" element={<CallDetail />} />
        </Routes>
      </main>
    </AuthorProvider>
  );
}

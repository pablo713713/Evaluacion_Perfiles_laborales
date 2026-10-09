import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import CandidatoPage from './pages/CandidatoPage'
import AdminPage from './pages/AdminPage'
import PsicologoPage from './pages/PsicologoPage'
import ProtectedRoute from './components/shared/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/evaluacion" element={
          <ProtectedRoute rolesPermitidos={['Candidato']}>
            <CandidatoPage />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute rolesPermitidos={['Administrador']}>
            <AdminPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute rolesPermitidos={['Psicologo', 'PsicologoLider']}>
            <PsicologoPage />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
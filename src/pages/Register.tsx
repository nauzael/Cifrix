import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Auto redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-card p-8 rounded-3xl shadow-xl shadow-primary/5 border border-border">
        <div className="mx-auto bg-muted p-6 rounded-2xl w-20 h-20 flex items-center justify-center mb-6">
          <Lock className="text-muted-foreground" size={32} />
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tight">
          Registro Deshabilitado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La creación de nuevas cuentas solo puede ser realizada por el administrador del sistema.
        </p>
        <div className="mt-8">
          <button
            onClick={() => navigate('/login')}
            className="w-full flex justify-center py-4 px-4 bg-primary text-primary-foreground text-sm font-black rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-lg shadow-primary/25"
          >
            Volver al Inicio de Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

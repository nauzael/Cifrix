import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-lg w-full border border-red-100 dark:border-red-900/30 text-center space-y-6">
                        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="text-red-500 w-10 h-10" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Algo salió mal</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                La aplicación ha encontrado un error inesperado. No te preocupes, tu sesión está segura.
                            </p>
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl text-left overflow-auto max-h-40 text-xs font-mono text-slate-600 dark:text-slate-400">
                            {this.state.error?.toString()}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
                        >
                            <RefreshCw size={20} />
                            Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

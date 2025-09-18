
import React from 'react';
import { toErrorMessage, serializeError } from '../utils/errorUtils';

interface ErrorViewProps {
  title: string;
  detail: string;
  retry?: boolean;
}

const ErrorView: React.FC<ErrorViewProps> = ({ title, detail, retry = true }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 bg-red-900/20 text-red-300">
    <h2 className="text-2xl font-bold mb-2">{title}</h2>
    <p className="text-center mb-4">Terjadi kesalahan yang tidak terduga. Coba muat ulang halaman.</p>
    <pre className="w-full max-w-lg p-3 mb-4 text-xs bg-red-900/50 rounded-md overflow-x-auto">
      {detail}
    </pre>
    {retry && (
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
      >
        Muat Ulang Halaman
      </button>
    )}
  </div>
);

const ServerErrorView: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 bg-red-900/20 text-red-300">
    <h2 className="text-2xl font-bold mb-2">Server Error (500)</h2>
    <p className="text-center mb-4">Terjadi kesalahan pada server. Silakan coba lagi nanti atau hubungi administrator.</p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
    >
      Muat Ulang Halaman
    </button>
  </div>
);

const is500Error = (error: Error | null): boolean => {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return message.includes('500') || message.includes('internal server error') || message.includes('server error');
};

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', serializeError(error), errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (is500Error(this.state.error)) {
        return <ServerErrorView />;
      }
      return (
        <ErrorView
          title="Terjadi Kesalahan"
          detail={toErrorMessage(this.state.error)}
          retry
        />
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
import { useEffect, useState } from 'react';
import { Loader2, Table, ShieldAlert, RefreshCw } from 'lucide-react';

interface Log {
  id: string;
  email: string;
  activity: string;
  timestamp: string;
}

export function AdminPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-soft border-[0.5px] border-stone-200 overflow-hidden">
      <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold text-primary-800">Security Audit Logs</h2>
        </div>
        <button 
          onClick={fetchLogs} 
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">User (Email)</th>
              <th className="px-6 py-3 font-medium">Activity</th>
              <th className="px-6 py-3 font-medium">Log ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-400">
                  No activity logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 text-stone-500 font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-primary-800">
                    {log.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.activity.includes('Analyze') 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.activity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-400 font-mono text-xs">
                    {log.id}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

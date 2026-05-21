import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className={isChatPage ? "flex-1 overflow-hidden relative" : "flex-1 overflow-auto p-4 md:p-6 lg:p-8"}>
          <div className={isChatPage ? "absolute inset-0" : "mx-auto max-w-7xl h-full"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

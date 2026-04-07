import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileEdit, 
  Package, 
  TrendingDown, 
  TrendingUp, 
  Activity,
  Menu,
  X,
  Users,
  History
} from 'lucide-react';
import { cn } from '../ui';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Bill Entry', path: '/bill-entry', icon: FileEdit },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'PMR (Purchases)', path: '/pmr', icon: TrendingDown },
  { name: 'SMR (Sales)', path: '/smr', icon: TrendingUp },
  { name: 'Product PL', path: '/product-pl', icon: Activity },
  { name: 'Price History', path: '/price-history', icon: History },
  { name: 'Vendor & Customer', path: '/vendor-customer', icon: Users },
];

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-30 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <Activity className="h-6 w-6" />
          <span>ProfitBook</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-2xl tracking-tight">
            <Activity className="h-7 w-7" />
            <span>ProfitBook</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 text-[15px] font-semibold">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-[0_2px_10px_rgb(37,99,235,0.06)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors")} />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-5 border-t border-slate-100 text-sm text-center text-slate-500 font-medium bg-slate-50/50">
          Herbalife ProfitBook <span className="text-slate-400 ml-1">v2.0</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-16 lg:pt-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

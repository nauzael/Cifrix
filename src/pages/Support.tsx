import { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  HelpCircle, 
  MessageCircle, 
  FileText, 
  Video,
  ExternalLink
} from 'lucide-react';

const articles = [
  {
    category: 'Primeros Pasos',
    items: [
      { title: 'Cómo configurar tu organización', icon: BookOpen },
      { title: 'Gestión de roles y permisos', icon: FileText },
      { title: 'Importar datos desde Excel', icon: Video },
    ]
  },
  {
    category: 'Módulo de Iglesia',
    items: [
      { title: 'Registro de diezmos y ofrendas', icon: BookOpen },
      { title: 'Generación de certificados de donación', icon: FileText },
      { title: 'Seguimiento de proyectos especiales', icon: Video },
    ]
  },
  {
    category: 'Contabilidad Avanzada',
    items: [
      { title: 'Cómo manejar el PUC profesional', icon: BookOpen },
      { title: 'Conciliación bancaria paso a paso', icon: FileText },
      { title: 'Generación de estados financieros', icon: Video },
    ]
  }
];

export function Support() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-16 pb-20 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-6 sm:pt-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <HelpCircle size={14} /> Soporte Técnico
        </div>
        <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          ¿Cómo podemos <span className="text-blue-600">ayudarte?</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-xl max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Explora nuestra base de conocimientos o contacta con nuestro equipo de expertos para resolver tus dudas.
        </p>
        
        <div className="relative max-w-2xl mx-auto mt-8 sm:mt-12 group animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <div className="absolute inset-0 bg-blue-600/20 blur-3xl group-focus-within:bg-blue-600/30 transition-all duration-500" />
          <div className="relative">
            <Search className="absolute left-5 sm:left-7 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Busca tutoriales, guías o funciones..."
              className="w-full pl-14 sm:pl-18 pr-6 py-5 sm:py-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-none text-base sm:text-xl outline-none focus:ring-0 focus:border-blue-600 transition-all dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {articles.map((cat, i) => (
          <div key={i} className="space-y-6 group animate-in fade-in slide-in-from-bottom-12 duration-700" style={{ animationDelay: `${400 + (i * 100)}ms` }}>
            <div className="flex items-center gap-4 border-b-2 border-slate-50 dark:border-slate-800 pb-4">
              <div className="size-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-500">
                <BookOpen size={20} />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs sm:text-sm">{cat.category}</h3>
            </div>
            <div className="space-y-3">
              {cat.items.map((item, j) => (
                <button 
                  key={j}
                  onClick={() => alert(`Próximamente: ${item.title}`)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all group/item text-left border border-transparent hover:border-slate-100 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-none"
                >
                  <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover/item:text-blue-600 group-hover/item:bg-blue-50 dark:group-hover/item:bg-blue-900/30 transition-all shrink-0">
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{item.title}</span>
                  <ChevronRight size={16} className="ml-auto text-slate-300 group-hover/item:text-blue-600 group-hover/item:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="relative group animate-in fade-in slide-in-from-bottom-12 duration-700 delay-700">
        <div className="absolute inset-0 bg-blue-600 rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
        <div className="bg-blue-600 dark:bg-blue-700 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-16 text-white flex flex-col lg:flex-row items-center justify-between gap-10 sm:gap-16 relative overflow-hidden">
          <div className="relative z-10 space-y-4 text-center lg:text-left max-w-xl">
            <h3 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">¿No encuentras lo que buscas?</h3>
            <p className="text-blue-100 text-base sm:text-lg font-medium opacity-90">Nuestro equipo de soporte está listo para acompañarte en cada paso. Respuesta promedio en menos de 2 horas.</p>
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto">
             <button 
               onClick={() => alert('El chat en vivo estará disponible pronto')}
               className="bg-white text-blue-600 px-8 sm:px-10 py-5 sm:py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 hover:scale-105 hover:bg-blue-50 active:scale-95 transition-all text-base sm:text-lg flex-1 sm:flex-none group/btn"
             >
               <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" /> Chat en Vivo
             </button>
             <button 
               onClick={() => alert('Sistema de tickets en construcción')}
               className="bg-blue-900/30 backdrop-blur-md text-white border-2 border-white/20 px-8 sm:px-10 py-5 sm:py-6 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-blue-900/50 active:scale-95 transition-all text-base sm:text-lg flex-1 sm:flex-none group/btn"
             >
               <HelpCircle size={24} className="group-hover:rotate-12 transition-transform" /> Crear Ticket
             </button>
          </div>
          <HelpCircle size={240} className="absolute -right-20 -bottom-20 text-white/10 hidden xl:block pointer-events-none" />
          <MessageCircle size={180} className="absolute -left-10 -top-10 text-white/5 hidden xl:block pointer-events-none" />
        </div>
      </div>

      {/* Footer Links */}
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 sm:gap-12 text-xs font-black text-slate-400 uppercase tracking-[0.2em] pb-10">
         <a href="#" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group">Términos <ExternalLink size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /></a>
         <a href="#" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group">Privacidad <ExternalLink size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /></a>
         <a href="#" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group">API Docs <ExternalLink size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /></a>
         <a href="#" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group">Comunidad <ExternalLink size={12} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /></a>
      </div>
    </div>
  );
}

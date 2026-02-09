import { useState } from 'react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2, 
  TrendingUp, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../lib/utils';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: '¡Hola! Soy Cifrix IA. ¿En qué puedo ayudarte con tu contabilidad hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const transactions = useLiveQuery(() => db.transactions.toArray());
  const members = useLiveQuery(() => db.members.toArray());

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Simulated AI Logic
    setTimeout(() => {
      let response = '';
      const lowerMsg = userMsg.toLowerCase();

      if (lowerMsg.includes('resumen') || lowerMsg.includes('estado')) {
        const totalIncome = transactions?.filter(t => t.type === 'ingreso').reduce((sum, t) => sum + ((t as any).amount || 0), 0) || 0;
        const totalExpense = transactions?.filter(t => t.type === 'egreso').reduce((sum, t) => sum + ((t as any).amount || 0), 0) || 0;
        response = `Tu balance actual es de $${formatCurrency(totalIncome - totalExpense)}. Has registrado $${formatCurrency(totalIncome)} en ingresos y $${formatCurrency(totalExpense)} en egresos.`;
      } else if (lowerMsg.includes('miembros')) {
        response = `Actualmente tienes ${members?.length || 0} miembros registrados. ${members?.filter(m => m.status === 'activo').length || 0} están activos.`;
      } else if (lowerMsg.includes('consejo') || lowerMsg.includes('ayuda')) {
        response = 'Te recomiendo revisar las categorías con más gastos este mes para optimizar tu presupuesto. También recuerda que los certificados de donación ya están disponibles en el módulo de miembros.';
      } else {
        response = 'Entiendo. Puedo ayudarte a analizar tus transacciones, ver el estado de tus miembros o darte consejos financieros basados en tus datos.';
      }

      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">Cifrix IA</h3>
                  <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Asistente Inteligente</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10' 
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700">
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Pregunta algo..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

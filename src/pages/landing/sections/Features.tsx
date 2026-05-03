import React from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  FileCheck,
  FileText,
  Database,
  Church,
  Cloud,
  type LucideIcon,
} from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const features: Feature[] = [
  {
    id: 'contabilidad-completa',
    title: 'Contabilidad Completa',
    description: 'PUC Colombiano actualizado. Comprobantes, libros, balances y más.',
    icon: Calculator,
  },
  {
    id: 'facturacion-electronica',
    title: 'Facturación Electrónica DIAN',
    description: 'Cumple con todas las resoluciones. Factura desde cualquier lugar.',
    icon: FileCheck,
  },
  {
    id: 'declaracion-renta',
    title: 'Declaración de Renta',
    description: 'Genera tu declaración de impuestos sin errores. Listo para presentar.',
    icon: FileText,
  },
  {
    id: 'reportes-exogenos',
    title: 'Reportes Exógenos',
    description: 'Información exógena lista para enviar. Sin complicaciones.',
    icon: Database,
  },
  {
    id: 'modulo-eclesiastico',
    title: 'Módulo Eclesiástico',
    description: 'Gestión de diezmos, ofrendas y miembros. Especial para iglesias.',
    icon: Church,
  },
{
  id: 'offline-sync',
  title: 'Offline-First + Sync Automático',
  description: 'Trabaja sin internet y sincroniza automáticamente cuando te conectes.',
  icon: Cloud,
},
];

interface FeaturesProps {
  title?: string;
}

export const Features: React.FC<FeaturesProps> = ({
  title = 'Características Principales de Cifrix',
}) => {
  return (
    <section
      id="features"
      className="relative py-16 sm:py-20 lg:py-24 bg-white dark:bg-slate-900"
      aria-label="Características principales"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.id}
                data-motion="true"
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                viewport={{ once: true, margin: '-50px' }}
                role="article"
                aria-labelledby={`feature-${feature.id}-title`}
              >
                {/* Icon Container */}
                <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/40 transition-shadow">
                  <feature.icon className="w-7 h-7" aria-hidden="true" />
                </div>

                {/* Title */}
                <h3
                  id={`feature-${feature.id}-title`}
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative gradient border on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-[0.03] dark:opacity-[0.05]" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;

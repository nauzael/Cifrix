import React from 'react';
import { motion } from 'framer-motion';
import {
  Church,
  HandCoins,
  FileSearch,
  Users,
  FileBarChart,
  Award,
  MapPin,
  ArrowRight,
  Star,
} from 'lucide-react';

interface ChurchFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Testimonial {
  text: string;
  author: string;
  church: string;
}

interface CTAData {
  title: string;
  price: string;
}

export const churchFeatures: ChurchFeature[] = [
  {
    id: 'diezmos-ofrendas',
    title: 'Gestión de Diezmos y Ofrendas',
    description: 'Registra y controla todos los aportes de los fieles de manera organizada y transparente.',
    icon: HandCoins,
  },
  {
    id: 'trazabilidad-donaciones',
    title: 'Trazabilidad de Donaciones',
    description: 'Seguimiento completo de cada donación desde su origen hasta su aplicación final.',
    icon: FileSearch,
  },
  {
    id: 'control-miembros',
    title: 'Control de Miembros',
    description: 'Gestiona la feligresía con registros detallados y seguimiento pastoral.',
    icon: Users,
  },
  {
    id: 'reportes-personalizados',
    title: 'Reportes Personalizados',
    description: 'Informes detallados para juntas directivas y requisitos legales.',
    icon: FileBarChart,
  },
  {
    id: 'certificados-donacion',
    title: 'Certificados de Donación',
    description: 'Emite certificados tributarios para donantes de manera automática.',
    icon: Award,
  },
  {
    id: 'multiples-sedes',
    title: 'Múltiples Sedes',
    description: 'Administra varias ubicaciones desde una cuenta centralizada.',
    icon: MapPin,
  },
];

export const testimonial: Testimonial = {
  text: 'Cifrix nos ha ayudado a llevar un control transparente de los diezmos y ofrendas. La trazabilidad es excelente y los reportes nos facilitan la rendición de cuentas ante la congregación.',
  author: 'Pastor Juan Pérez',
  church: 'Iglesia Vida Nueva',
};

export const ctaData: CTAData = {
  title: 'Plan para Iglesias',
  price: '$29,900/mes',
};

interface ChurchModuleProps {
  title?: string;
  subtitle?: string;
}

export const ChurchModule: React.FC<ChurchModuleProps> = ({
  title = 'Especial para Iglesias y Ministerios',
  subtitle = 'Software contable especializado para gestión de iglesias',
}) => {
  return (
    <section
      id="church-module"
      className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950"
      aria-label="Módulo especial para iglesias"
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
            <motion.div
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 mb-6"
            >
              <Church className="w-8 h-8" aria-hidden="true" />
            </motion.div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              {title}
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              {subtitle}
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
            {churchFeatures.map((feature, index) => (
              <motion.div
                key={feature.id}
                data-motion="true"
                className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-lg border border-purple-100 dark:border-purple-900/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                viewport={{ once: true, margin: '-50px' }}
                role="article"
                aria-labelledby={`church-feature-${feature.id}-title`}
              >
                {/* Icon Container */}
                <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/40 transition-shadow">
                  <feature.icon className="w-7 h-7" aria-hidden="true" />
                </div>

                {/* Title */}
                <h3
                  id={`church-feature-${feature.id}-title`}
                  className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors"
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.description}
                </p>

                {/* Decorative gradient border on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 opacity-[0.03] dark:opacity-[0.05]" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Testimonial Section */}
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 sm:p-10 shadow-lg border border-purple-100 dark:border-purple-900/30 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="flex items-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  aria-hidden="true"
                />
              ))}
            </div>
            <blockquote className="text-lg sm:text-xl text-slate-700 dark:text-slate-200 italic mb-6 leading-relaxed">
              "{testimonial.text}"
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {testimonial.author.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {testimonial.author}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">
                  {testimonial.church}
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 shadow-xl shadow-purple-500/30">
              <div className="text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                  {ctaData.title}
                </h3>
                <p className="text-purple-100 text-lg sm:text-xl font-semibold">
                  {ctaData.price}
                </p>
              </div>
              <a
                href="/register?plan=church"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
                aria-label={`Comenzar con ${ctaData.title} - ${ctaData.price}`}
              >
                Comenzar Ahora
                <ArrowRight
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ChurchModule;

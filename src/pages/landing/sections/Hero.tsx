import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Monitor, Database, Sparkles } from 'lucide-react';

interface HeroProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
}

export const Hero: React.FC<HeroProps> = ({
  title = 'Software Contable Colombiano que Funciona Sin Internet',
  subtitle = 'Plataforma offline-first para Colombia. Facturación electrónica, declaración de renta y módulo para iglesias. ¡Trabaja sin internet y sincroniza automáticamente!',
  badgeText = '✨ Nuevo: Módulo de IA para contabilidad',
  primaryCtaText = 'Comienza Gratis',
  secondaryCtaText = 'Ver Demo',
  primaryCtaHref = '/register',
  secondaryCtaHref = '#demo',
}) => {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950"
      aria-label="Hero section"
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-20"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[610px] rounded-full bg-blue-400 opacity-20 blur-[100px]" />
        <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[610px] rounded-full bg-purple-400 opacity-20 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="flex flex-col items-center lg:items-start text-center lg:text-left"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-6"
              >
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-shadow"
                  role="status"
                  aria-live="polite"
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  {badgeText}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {subtitle}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {/* Primary CTA */}
                <a
                  href={primaryCtaHref}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
                  aria-label={primaryCtaText}
                >
                  {primaryCtaText}
                  <ArrowRight
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </a>

                {/* Secondary CTA */}
                <a
                  href={secondaryCtaHref}
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
                  aria-label={secondaryCtaText}
                >
                  {secondaryCtaText}
                </a>
              </motion.div>

              {/* Feature Icons */}
              <motion.div
                className="flex items-center gap-6 mt-10 text-slate-500 dark:text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                aria-label="Características principales"
              >
                <div className="flex items-center gap-2" role="img" aria-label="Funciona sin internet">
                  <Monitor className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Offline-first</span>
                </div>
                <div className="flex items-center gap-2" role="img" aria-label="Sincronización automática">
                  <Database className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Auto-sync</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Dashboard Image/Illustration */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Main Dashboard Container */}
                <motion.div
                  className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-slate-300/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 overflow-hidden"
                  initial={{ y: 0 }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {/* Dashboard Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
                        </div>
                        <span className="text-white font-bold text-sm sm:text-base">
                          Cifrix Dashboard
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                          <Database className="w-3 h-3" aria-hidden="true" />
                          Offline
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">
                          Ingresos
                        </div>
                        <div className="text-sm sm:text-lg font-black text-slate-900 dark:text-white">
                          $24.5M
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-semibold mb-1">
                          Gastos
                        </div>
                        <div className="text-sm sm:text-lg font-black text-slate-900 dark:text-white">
                          $18.2M
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 sm:p-4">
                        <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 font-semibold mb-1">
                          Balance
                        </div>
                        <div className="text-sm sm:text-lg font-black text-slate-900 dark:text-white">
                          $6.3M
                        </div>
                      </div>
                    </div>

                    {/* Chart Placeholder */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Rendimiento
                        </span>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                          +15.3%
                        </span>
                      </div>
                      <div className="h-24 sm:h-32 flex items-end gap-1 sm:gap-2">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((height, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-600 to-purple-600 rounded-t opacity-80"
                            style={{ height: `${height}%` }}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Transacciones Recientes
                      </div>
                      {[
                        { label: 'Factura #001', amount: '+$2.5M', color: 'text-green-600' },
                        { label: 'Pago proveedor', amount: '-$800K', color: 'text-red-600' },
                        { label: 'Diezmos', amount: '+$1.2M', color: 'text-green-600' },
                      ].map((transaction, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {transaction.label}
                          </span>
                          <span
                            className={`text-sm font-bold ${transaction.color}`}
                          >
                            {transaction.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Floating Badge - Offline */}
                <motion.div
                  className="absolute -top-4 -right-4 sm:-right-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 border border-slate-200 dark:border-slate-700"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Sin Internet
                    </span>
                  </div>
                </motion.div>

                {/* Floating Badge - Auto Sync */}
                <motion.div
                  className="absolute -bottom-4 -left-4 sm:-left-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 border border-slate-200 dark:border-slate-700"
                  initial={{ y: 0 }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Auto Sync
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

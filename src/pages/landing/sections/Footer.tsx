import React from 'react';
import { motion } from 'framer-motion';
import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  Github, 
  Mail, 
  Phone, 
  MapPin,
  ArrowRight
} from 'lucide-react';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  
  const quickLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Precios', href: '/precios' },
    { label: 'Docs', href: '/docs' },
    { label: 'Soporte', href: '/soporte' },
  ];

  const legalLinks = [
    { label: 'Términos', href: '/terminos' },
    { label: 'Privacidad', href: '/privacidad' },
    { label: 'Cookies', href: '/cookies' },
  ];

  const socialLinks = [
    { 
      label: 'Twitter', 
      href: 'https://twitter.com/cifrix', 
      icon: Twitter 
    },
    { 
      label: 'Facebook', 
      href: 'https://facebook.com/cifrix', 
      icon: Facebook 
    },
    { 
      label: 'LinkedIn', 
      href: 'https://linkedin.com/company/cifrix', 
      icon: Linkedin 
    },
    { 
      label: 'GitHub', 
      href: 'https://github.com/cifrix', 
      icon: Github 
    },
  ];

  const contactInfo = [
    { 
      label: 'Email', 
      value: 'contacto@cifrix.com', 
      href: 'mailto:contacto@cifrix.com',
      icon: Mail 
    },
    { 
      label: 'Teléfono', 
      value: '+57 (601) 123-4567', 
      href: 'tel:+57601123456',
      icon: Phone 
    },
    { 
      label: 'Ubicación', 
      value: 'Bogotá, Colombia', 
      href: 'https://maps.google.com/?q=Bogota,Colombia',
      icon: MapPin 
    },
  ];

  return (
    <footer 
      className={`bg-slate-900 dark:bg-slate-950 text-slate-300 dark:text-slate-400 ${className}`}
      role="contentinfo"
      aria-label="Footer"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Logo & Description */}
          <motion.div 
            className="flex flex-col space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <a 
              href="/" 
              className="inline-flex items-center gap-2 group"
              aria-label="Cifrix - Ir al inicio"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
                <span className="text-white font-black text-lg">C</span>
              </div>
              <span className="text-xl font-bold text-white">Cifrix</span>
            </a>
            <p className="text-sm leading-relaxed max-w-xs">
              Software contable colombiano que funciona sin internet. 
              Facturación electrónica, declaración de renta y más.
            </p>
          </motion.div>

          {/* Column 2: Quick Links */}
          <motion.div 
            className="flex flex-col space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Enlaces Rápidos
            </h3>
            <nav className="flex flex-col space-y-2" aria-label="Enlaces rápidos">
              {quickLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm hover:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 inline-flex items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
                  aria-label={link.label}
                >
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>

          {/* Column 3: Legal */}
          <motion.div 
            className="flex flex-col space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">
              Legal
            </h3>
            <nav className="flex flex-col space-y-2" aria-label="Enlaces legales">
              {legalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm hover:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 inline-flex items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
                  aria-label={link.label}
                >
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>

          {/* Column 4: Contact & Social */}
          <motion.div 
            className="flex flex-col space-y-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            {/* Contact Info */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3">
                Contacto
              </h3>
              <div className="flex flex-col space-y-2">
                {contactInfo.map((info) => {
                  const Icon = info.icon;
                  return (
                    <a
                      key={info.label}
                      href={info.href}
                      className="text-sm hover:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 inline-flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
                      aria-label={`${info.label}: ${info.value}`}
                    >
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" aria-hidden="true" />
                      <span>{info.value}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-3">
                Síguenos
              </h3>
              <nav className="flex items-center gap-3" aria-label="Redes sociales">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-slate-800 dark:bg-slate-900 rounded-lg flex items-center justify-center hover:bg-blue-600 dark:hover:bg-blue-600 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                      aria-label={`Visitar ${social.label} de Cifrix`}
                    >
                      <Icon 
                        className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" 
                        aria-hidden="true" 
                      />
                    </a>
                  );
                })}
              </nav>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div 
          className="border-t border-slate-800 dark:border-slate-900 mt-12 pt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              © {currentYear} Cifrix. Todos los derechos reservados.
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Hecho con ❤️ en Colombia 🇨🇴
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;

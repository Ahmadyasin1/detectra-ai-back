import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle, AlertCircle, Sparkles, Users } from 'lucide-react';

const TEAM_PHOTO_SRC = '/3%20nomony.png';
import PageHero from '../components/PageHero';
import { submitContactForm } from '../lib/supabaseDb';

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitErrorMsg(null);
    const { error } = await submitContactForm({
      name: formData.name,
      email: formData.email,
      message: formData.message,
    });
    if (error) {
      setSubmitStatus('error');
      setSubmitErrorMsg(
        error === 'guest_mode'
          ? 'Online form is unavailable right now — please email us directly at mianahmadyasin3@gmail.com.'
          : error,
      );
    } else {
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 6000);
    }
    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      details: [
        'ahmadyasin.info@gmail.com',
        'admin@nexariza.com'
      ],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Phone,
      title: 'Contact',
      details: ['+92 370 7348001', 'Mon–Fri, 9AM–6PM PKT'],
      color: 'from-cyan-500 to-green-500',
    },
    {
      icon: MapPin,
      title: 'Location',
      details: ['University of Central Punjab', 'Lahore, Pakistan'],
      color: 'from-green-500 to-yellow-500',
    },
  ];

  const teamContacts = [
    {
      name:  'Ahmad Yasin',
      role:  'AI Engineer · Lead Developer',
      email: 'mianahmadyasin3@gmail.com',
    },
    {
      name:  'Eman Sarfraz',
      role:  'AI Engineer · Backend & Pipeline',
      email: 'emansarfraz@student.ucp.edu.pk',
    },
    {
      name:  'Abdul Rehman',
      role:  'AI Engineer · Frontend & Integration',
      email: 'abdulrehman@student.ucp.edu.pk',
    },
    {
      name:  'Dr. Usman Aamer',
      role:  'Project Supervisor (Phases 1-2) · Director FOIT',
      email: 'usmanaamer1@gmail.com',
    },
    {
      name:  'Yasin Nasir',
      role:  'Project Supervisor (Phases 3-4)',
      email: 'yasin.nasir@ucp.edu.pk',
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Contact"
        badgeIcon={Mail}
        title="Get In"
        titleAccent="Touch"
        description="Have a project in mind? Let's build something amazing together."
      >
        <div className="w-full max-w-5xl mx-auto">
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {contactInfo.map((info, index) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 text-center h-full">
                    <div className={`w-16 h-16 bg-gradient-to-br ${info.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <info.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">{info.title}</h3>
                    <div className="space-y-2">
                      {info.details.map((detail, detailIndex) => (
                        <p key={detailIndex} className="text-gray-300 text-sm">{detail}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </PageHero>

      {/* Team photo */}
      <section className="relative px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8 -mt-2">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-8 sm:mb-10"
          >
            <span className="elite-label inline-flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              The people behind Detectra
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Meet our <span className="text-gradient-cyan">core team</span>
            </h2>
            <p className="mt-2 text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
              BSAI Final Year Project · University of Central Punjab, Lahore
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="group relative"
          >
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="max-w-5xl mx-auto mb-16"
          >
            <div className="relative rounded-3xl overflow-hidden border border-cyan-500/25 bg-white/5 backdrop-blur-md shadow-2xl shadow-cyan-500/10">
              <img
                src="/3 nomony.png"
                alt="Detectra AI team group"
                className="w-full h-[260px] sm:h-[660px] object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 sm:p-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-semibold uppercase tracking-widest mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Detectra AI Core Team
                </div>
                <p className="text-white text-sm sm:text-base font-medium">
                  Abdul Rehman , Ahmad Yasin , Eman Sarfraz 
                </p>
              </div>
            </div>
          </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Team Section */}
      <section ref={ref} className="py-16 sm:py-24 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-cyan-500/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 transition-all"
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-cyan-500/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Message</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-cyan-500/20 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                      placeholder="Tell us about your project..."
                      required
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                    <Send className="w-5 h-5" />
                  </motion.button>

                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Message sent successfully! We'll get back to you soon.</span>
                    </motion.div>
                  )}

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm text-left"
                    >
                      <div className="flex items-center gap-2 font-medium text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        Could not save your message
                      </div>
                      {submitErrorMsg && (
                        <p className="text-red-400/80 text-xs leading-relaxed pl-7">
                          {submitErrorMsg.includes('relation') || submitErrorMsg.includes('does not exist')
                            ? 'The contact form needs the contact_submissions table in Supabase. Run the project SQL migration in the dashboard.'
                            : submitErrorMsg}
                        </p>
                      )}
                    </motion.div>
                  )}
                </form>
              </div>
            </motion.div>

            {/* Team Contacts */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <h3 className="text-2xl font-bold text-white mb-6">Team Contacts</h3>
                
                <div className="space-y-6">
                  {teamContacts.map((member, index) => (
                    <motion.div
                      key={member.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      className="p-4 bg-white/10 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
                    >
                      <h4 className="text-white font-semibold mb-2">{member.name}</h4>
                      <p className="text-cyan-400 text-sm mb-2">{member.role}</p>
                      <div className="space-y-1">
                        <p className="text-gray-300 text-sm">{member.email}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

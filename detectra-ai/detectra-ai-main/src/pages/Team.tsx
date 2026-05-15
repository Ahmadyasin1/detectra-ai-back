import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Github, Mail, Users, Award, Star, Sparkles } from 'lucide-react';

// Gradient initials avatar — shown when no photo is available
function Avatar({ name, gradient }: { name: string; gradient: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
      <span className="text-white font-extrabold text-3xl select-none">{initials}</span>
    </div>
  );
}

// Image with fallback to gradient avatar
function MemberAvatar({ src, name, gradient }: { src: string; name: string; gradient: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Avatar name={name} gradient={gradient} />;
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className="relative w-24 h-24 object-cover rounded-2xl flex-shrink-0"
    />
  );
}

export default function Team() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const team = [
    {
      name: 'Dr. Usman Aamer',
      role: 'Project Supervisor (Phases 1-2)',
      org: 'Director FOIT · University of Central Punjab',
      bio: 'Distinguished academic leader and AI researcher guiding innovative FYP projects at UCP, specialising in computer vision and intelligent systems.',
      avatar: '/usman-aamer.jpg',
      gradient: 'from-blue-500 to-indigo-600',
      linkedin: 'https://linkedin.com/in/usman-aamer',
      github: '',
      email: 'usman.aamer@ucp.edu.pk',
      responsibilities: ['Research Supervision', 'Academic Guidance', 'Project Oversight'],
      featured: false,
    },
    {
      name: 'Dr. Yasin Nasir',
      role: 'Project Supervisor (Phases 3-4)',
      org: 'University of Central Punjab',
      bio: 'Supervisor for advanced phases of the project, guiding evaluation quality, research framing, and production-readiness direction.',
      avatar: '/yasin-nasir.jpg',
      gradient: 'from-indigo-500 to-violet-600',
      linkedin: '',
      github: '',
      email: 'yasin.nasir@ucp.edu.pk',
      responsibilities: ['Advanced Phase Supervision', 'Research Validation', 'Deployment Strategy'],
      featured: false,
    },
    {
      name: 'Ahmad Yasin',
      role: 'Main Developer · AI Engineer',
      org: 'BSAI · University of Central Punjab',
      bio: 'Primary developer of Detectra AI, leading system architecture, frontend-backend integration, and overall product delivery.',
      avatar: '/ahmad-yasin.jpg',
      gradient: 'from-cyan-500 to-blue-600',
      linkedin: 'https://linkedin.com/in/mian-ahmad-yasin',
      github: 'https://github.com/Ahmadyasin1',
      email: 'mianahmadyasin3@gmail.com',
      responsibilities: ['Pipeline Architecture', 'Full-Stack Development', 'AI Model Integration'],
    },
    {
      name: 'Eman Sarfraz',
      role: 'Team Member · Backend & Documentation',
      org: 'BSAI · University of Central Punjab',
      bio: 'Responsible for backend processing, documentation, and coordinating team deliverables across research and development phases.',
      avatar: '/eman-sarfraz.jpg',
      gradient: 'from-purple-500 to-pink-600',
      linkedin: 'https://www.linkedin.com/in/eman-sarfraz-146a8728a/',
      github: '',
      email: 'emansarfraz@ucp.edu.pk',
      responsibilities: ['Backend Development', 'Research & Documentation', 'Team Coordination'],
    },
    {
      name: 'Abdul Rehman',
      role: 'AI Engineer · Frontend & Integration',
      org: 'BSAI · University of Central Punjab',
      bio: 'Frontend developer and system integration specialist, building the interactive UI and connecting the multimodal AI modules to the web interface.',
      avatar: '/abdul-rehman.jpg',
      gradient: 'from-green-500 to-teal-600',
      linkedin: 'https://www.linkedin.com/in/abdul-rehman-a49365320/',
      github: '',
      email: 'abdulrehman@ucp.edu.pk',
      responsibilities: ['Frontend Development', 'System Integration', 'UI/UX Design'],
    },
  ];

  const teamStats = [
    { number: '3', label: 'Core Members', icon: Users },
    { number: '2', label: 'Academic Supervisors', icon: Award },
    { number: '1', label: 'Main Developer', icon: Star },
    { number: '100%', label: 'Commitment', icon: Award },
  ];

  return (
    <div className="pt-24 min-h-screen">
      {/* Hero Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              Our <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Team</span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              BSAI Final Year Project team at the University of Central Punjab. Ahmad Yasin serves as the main developer, supported by Abdul Rehman and Eman Sarfraz under two-phase supervision: Dr. Usman Aamer (Phases 1-2) and Dr. Yasin Nasir (Phases 3-4).
            </p>
          </motion.div>

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

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {teamStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-gray-300 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Members Section */}
      <section ref={ref} className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <div className="relative">
                  <div className={`absolute inset-0 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity ${member.featured ? 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30' : 'bg-gradient-to-br from-cyan-500/15 to-blue-600/15'}`} />

                  <div className={`relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border transition-all duration-300 ${member.featured ? 'border-cyan-400/45 shadow-2xl shadow-cyan-500/10' : 'border-cyan-500/20 hover:border-cyan-500/50'}`}>
                    <div className="flex items-start gap-6 mb-6">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                        <MemberAvatar src={member.avatar} name={member.name} gradient={member.gradient} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {member.featured ? (
                            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                              Main Developer
                            </span>
                          ) : (member.name !== 'Dr. Usman Aamer' && member.name !== 'Dr. Yasin Nasir') ? (
                            <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                              Team Member
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                              Supervisor
                            </span>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">{member.name}</h3>
                        <p className="text-cyan-400 font-semibold mb-1">{member.role}</p>
                        <p className="text-gray-400 text-sm mb-4">{member.org}</p>
                        <p className="text-gray-300 text-sm leading-relaxed">{member.bio}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-white font-semibold mb-3">Key Responsibilities:</h4>
                      <div className="flex flex-wrap gap-2">
                        {member.responsibilities.map((responsibility, respIndex) => (
                          <span
                            key={respIndex}
                            className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs"
                          >
                            {responsibility}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {member.linkedin && (
                        <motion.a
                          href={member.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                        >
                          <Linkedin className="w-4 h-4 text-cyan-400" />
                        </motion.a>
                      )}
                      {member.github && (
                        <motion.a
                          href={member.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                        >
                          <Github className="w-4 h-4 text-cyan-400" />
                        </motion.a>
                      )}
                      <motion.a
                        href={`mailto:${member.email}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                      >
                        <Mail className="w-4 h-4 text-cyan-400" />
                      </motion.a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Collaborate</span>?
            </h2>
            <p className="text-gray-300 text-xl mb-8 max-w-2xl mx-auto">
              Connect with our team to learn more about Detectra AI and explore collaboration opportunities.
            </p>
            
            <Link to="/contact">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all cursor-pointer"
              >
                Get in Touch
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


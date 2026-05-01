import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Github, Mail, Users, Award, BookOpen } from 'lucide-react';

export default function Team() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const team = [
    {
      name: 'Usman Aamer',
      role: 'Supervisor & Director',
      org: 'FOIT, University of Central Punjab',
      bio: 'Distinguished academic leader and research supervisor guiding innovative AI projects and fostering technological advancement',
      avatar: '/usman-aamer.jpg',
      linkedin: 'https://linkedin.com/in/usman-aamer',
      github: '',
      email: 'usman.aamer@ucp.edu.pk',
      responsibilities: ['Research Supervision', 'Academic Guidance', 'Project Oversight'],
    },
    {
      name: 'Ahmad Yasin',
      role: 'Founder & CEO',
      org: 'Nexariza AI',
      bio: 'Visionary leader driving AI innovation and spearheading Detectra AI initiatives',
      avatar: '/ahmad-yasin.jpg',
      linkedin: 'https://linkedin.com/in/mian-ahmad-yasin',
      github: 'https://github.com/Ahmadyasin1',
      email: 'ahmad.yasin@nexariza.com',
      responsibilities: ['Project Leadership', 'AI Strategy', 'Business Development'],
    },
    {
      name: 'Eman Sarfraz',
      role: 'Chief Operating Officer',
      org: 'Nexariza AI',
      bio: 'Operations excellence and documentation strategist managing team coordination',
      avatar: '/eman-sarfraz.jpg',
      linkedin: 'https://www.linkedin.com/in/eman-sarfraz-146a8728a/',
      github: '',
      email: 'eman.sarfraz@nexariza.com',
      responsibilities: ['Operations Management', 'Documentation', 'Team Coordination'],
    },
    {
      name: 'Abdul Rehman',
      role: 'AI/ML Engineer',
      org: 'Nexariza AI',
      bio: 'Technical architect building cutting-edge AI detection systems and models',
      avatar: '/abdul-rehman.jpg',
      linkedin: 'https://www.linkedin.com/in/abdul-rehman-a49365320/',
      github: '',
      email: 'abdul.rehman@nexariza.com',
      responsibilities: ['AI Model Development', 'Technical Architecture', 'System Integration'],
    },
  ];

  const teamStats = [
    { number: '4', label: 'Team Members', icon: Users },
    { number: '1', label: 'Academic Supervisor', icon: Award },
    { number: '12+', label: 'Months Experience', icon: BookOpen },
    { number: '100%', label: 'Commitment', icon: Award },
  ];

  return (
    <div className="pt-20">
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
              Brilliant minds from Nexariza AI and Detecra AI working together to shape the future
            </p>
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
      <section ref={ref} className="py-20 sm:py-32 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="relative w-24 h-24 object-cover rounded-2xl"
                        />
                      </div>
                      
                      <div className="flex-1">
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
              Connect with our team to learn more about Detectra AI and explore collaboration opportunities
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


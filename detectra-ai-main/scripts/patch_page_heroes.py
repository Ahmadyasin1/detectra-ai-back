"""One-off: replace custom page headers with PageHero."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src" / "pages"


def ensure_import(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if "import PageHero" in text:
        return
    text = text.replace(
        "} from 'lucide-react';",
        "} from 'lucide-react';\nimport PageHero from '../components/PageHero';",
        1,
    )
    path.write_text(text, encoding="utf-8")


def replace_block(path: Path, start_marker: str, end_marker: str, replacement: str) -> None:
    text = path.read_text(encoding="utf-8")
    if start_marker not in text:
        print(f"SKIP {path.name}: start not found")
        return
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    path.write_text(text[:start] + replacement + text[end:], encoding="utf-8")
    print(f"Patched {path.name}")


def patch_timeline() -> None:
    p = ROOT / "Timeline.tsx"
    ensure_import(p)
    replace_block(
        p,
        "  return (\n    <div className=\"pt-24 min-h-screen bg-transparent\">",
        "      {/* Metrics strip */}",
        """  return (
    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Project Timeline · Aug 2025 – Jul 2026"
        badgeIcon={TrendingUp}
        title="Development"
        titleAccent="Progress"
        description="12-month structured delivery plan for Detectra AI — from research to production-ready multimodal video intelligence platform."
      />

      {/* Metrics strip */}""",
    )


def patch_research() -> None:
    p = ROOT / "ResearchLiterature.tsx"
    ensure_import(p)
    replace_block(
        p,
        "export default function ResearchLiterature() {\n  const headerRef = useRef(null);\n  const headerIn  = useInView(headerRef, { once: true, margin: '-80px' });\n\n  return (\n    <div className=\"pt-24 min-h-screen bg-transparent\">",
        "      {/* Papers grid */}",
        """export default function ResearchLiterature() {
  return (
    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Research Foundation · 8 Key Papers"
        badgeIcon={BookOpen}
        title="Literature"
        titleAccent="Review"
        description="The academic papers that directly underpin every AI module in Detectra AI — from detection backbone to cross-modal fusion engine."
      />

      {/* Papers grid */}""",
    )


def patch_contact() -> None:
    p = ROOT / "Contact.tsx"
    ensure_import(p)
    old = """    <div className="pt-24 min-h-screen">
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
              Get In <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Touch</span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Have a project in mind? Let's build something amazing together
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">"""
    new = """    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Contact"
        badgeIcon={Mail}
        title="Get In"
        titleAccent="Touch"
        description="Have a project in mind? Let's build something amazing together."
      >
        <div className="w-full max-w-5xl mx-auto">
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">"""
    text = p.read_text(encoding="utf-8")
    if old not in text:
        print("SKIP Contact")
        return
    text = text.replace(old, new, 1)
    text = text.replace(
        """          </div>
        </div>
      </section>

      {/* Contact Form & Team Section */}""",
        """          </motion.div>
        </div>
      </PageHero>

      {/* Contact Form & Team Section */}""",
        1,
    )
    p.write_text(text, encoding="utf-8")
    print("Patched Contact.tsx")


def patch_team() -> None:
    p = ROOT / "Team.tsx"
    ensure_import(p)
    old = """    <div className="pt-24 min-h-screen">
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

          <motion.div"""
    new = """    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Detectra AI · UCP BSAI"
        badgeIcon={Users}
        title="Our"
        titleAccent="Team"
        description="BSAI Final Year Project team at the University of Central Punjab. Ahmad Yasin serves as the main developer, supported by Abdul Rehman and Eman Sarfraz under two-phase supervision: Dr. Usman Aamer (Phases 1-2) and Dr. Yasin Nasir (Phases 3-4)."
      >
        <div className="w-full max-w-5xl mx-auto space-y-10">
          <motion.div"""
    text = p.read_text(encoding="utf-8")
    if old not in text:
        print("SKIP Team")
        return
    text = text.replace(old, new, 1)
    text = text.replace(
        """          </div>
        </div>
      </section>

      {/* Team Members Section */}""",
        """          </div>
        </div>
      </PageHero>

      {/* Team Members Section */}""",
        1,
    )
    p.write_text(text, encoding="utf-8")
    print("Patched Team.tsx")


def patch_business() -> None:
    p = ROOT / "BusinessCase.tsx"
    ensure_import(p)
    old = """    <div className="pt-24 min-h-screen">
      {/* Hero Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        
        <motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              Business <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Case</span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Comprehensive business case for Detectra AI investment and market opportunity
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">"""
    # file uses div not motion.div for max-w-7xl
    old = old.replace(
        '<motion.div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">',
        '<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">',
    )
    new = """    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Market opportunity"
        badgeIcon={TrendingUp}
        title="Business"
        titleAccent="Case"
        description="Comprehensive business case for Detectra AI investment and market opportunity."
      >
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">"""
    text = p.read_text(encoding="utf-8")
    if old not in text:
        print("SKIP BusinessCase")
        return
    text = text.replace(old, new, 1)
    text = text.replace(
        """          </motion.div>
        </motion.div>
      </section>

      {/* Target Markets Section */}""",
        """          </div>
        </div>
      </PageHero>

      {/* Target Markets Section */}""",
        1,
    )
    # fallback closing
    if "Target Markets Section" in text and "</PageHero>" not in text.split("Target Markets")[0]:
        text = text.replace(
            """          </div>
        </div>
      </section>

      {/* Target Markets Section */}""",
            """          </div>
        </div>
      </PageHero>

      {/* Target Markets Section */}""",
            1,
        )
    p.write_text(text, encoding="utf-8")
    print("Patched BusinessCase.tsx")


def patch_fyp() -> None:
    p = ROOT / "FYPProject.tsx"
    ensure_import(p)
    old = """    <div className="pt-24 min-h-screen">
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
              FYP <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Project</span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              A comprehensive multimodal video intelligence platform for autonomous video analysis
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">"""
    new = """    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Final Year Project · UCP"
        badgeIcon={Brain}
        title="FYP"
        titleAccent="Project"
        description="A comprehensive multimodal video intelligence platform for autonomous video analysis."
      >
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">"""
    text = p.read_text(encoding="utf-8")
    if old not in text:
        print("SKIP FYPProject")
        return
    text = text.replace(old, new, 1)
    text = text.replace(
        """          </div>
        </div>
      </section>

      {/* Abstract Section */}""",
        """          </div>
        </div>
      </PageHero>

      {/* Abstract Section */}""",
        1,
    )
    p.write_text(text, encoding="utf-8")
    print("Patched FYPProject.tsx")


def patch_project() -> None:
    p = ROOT / "Project.tsx"
    ensure_import(p)
    if "Brain" not in p.read_text(encoding="utf-8"):
        t = p.read_text(encoding="utf-8")
        t = t.replace(
            "} from 'lucide-react';",
            "} from 'lucide-react';\nimport { Brain } from 'lucide-react';\nimport PageHero from '../components/PageHero';",
            1,
        )
        p.write_text(t, encoding="utf-8")
    else:
        ensure_import(p)
    old = """    <div className="pt-24 min-h-screen">
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
              FYP <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Project</span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              A comprehensive multimodal video intelligence platform for autonomous video analysis
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">"""
    new = """    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Project overview"
        badgeIcon={Brain}
        title="FYP"
        titleAccent="Project"
        description="A comprehensive multimodal video intelligence platform for autonomous video analysis."
      >
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">"""
    text = p.read_text(encoding="utf-8")
    if old not in text:
        print("SKIP Project.tsx")
        return
    text = text.replace(old, new, 1)
    text = text.replace(
        """          </div>
        </div>
      </section>

      {/* Objectives Section */}""",
        """          </div>
        </div>
      </PageHero>

      {/* Objectives Section */}""",
        1,
    )
    p.write_text(text, encoding="utf-8")
    print("Patched Project.tsx")


if __name__ == "__main__":
    patch_timeline()
    patch_research()
    patch_contact()
    patch_team()
    patch_business()
    patch_fyp()
    patch_project()

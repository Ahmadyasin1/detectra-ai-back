from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src" / "pages" / "Contact.tsx"
t = p.read_text(encoding="utf-8")
start = t.index("      {/* Team photo")
end = t.index("      {/* Contact Form & Team Section */}")
new = """      {/* Team photo — compact; full poster so faces stay visible */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-5"
          >
            <span className="elite-label inline-flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              Our team
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Meet the <span className="text-gradient-cyan">Detectra</span> team
            </h2>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="elite-card overflow-hidden border border-white/10 bg-[#0a0e14]/90"
          >
            <motion.div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
            <figcaption className="border-t border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90 mb-1.5">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    FYP 2025–26 · UCP Lahore
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Ahmad Yasin · Abdul Rehman · Eman Sarfraz
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. Usman Aamer &amp; Dr. Yasin Nasir — supervisors
                  </p>
                </motion.div>
                <div className="flex flex-wrap gap-1.5">
                  {['Multimodal AI', 'BSAI', 'FOIT'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </figcaption>
          </motion.figure>
        </motion.div>
      </section>

"""
# fix mismatched tags in template
new = new.replace(
    """            <motion.div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>""",
    """            <div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>""",
)
new = new.replace("                </motion.div>\n                <div className=\"flex flex-wrap", "                </motion.div>\n                <motion.div className=\"flex flex-wrap")
# Still wrong - rewrite figcaption part cleanly
new = """      {/* Team photo — compact; full poster so faces stay visible */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-5"
          >
            <span className="elite-label inline-flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              Our team
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Meet the <span className="text-gradient-cyan">Detectra</span> team
            </h2>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="elite-card overflow-hidden border border-white/10 bg-[#0a0e14]/90"
          >
            <div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
            <figcaption className="border-t border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90 mb-1.5">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    FYP 2025–26 · UCP Lahore
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Ahmad Yasin · Abdul Rehman · Eman Sarfraz
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. Usman Aamer &amp; Dr. Yasin Nasir — supervisors
                  </p>
                </motion.div>
                <motion.div className="flex flex-wrap gap-1.5">
                  {['Multimodal AI', 'BSAI', 'FOIT'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </figcaption>
          </motion.figure>
        </motion.div>
      </section>

"""
# final fix all div/motion mismatches
fixes = [
    ("            </motion.div>\n            <figcaption", "            </motion.div>\n            <figcaption"),
    ("            <div className=\"flex items-center", "            <div className=\"flex items-center"),
    ("                </motion.div>\n                <motion.div className=\"flex flex-wrap", "                </motion.div>\n                <motion.div className=\"flex flex-wrap"),
]
new = new.replace("            </motion.div>\n            <figcaption", "            </motion.div>\n            <figcaption")
new = new.replace(
    "            <div className=\"flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4\">\n              <img\n                src={TEAM_PHOTO_SRC}\n                alt=\"Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz\"\n                className=\"w-full max-h-[220px] sm:max-h-[260px] object-contain object-center\"\n                loading=\"lazy\"\n                decoding=\"async\"\n              />\n            </motion.div>",
    "            <div className=\"flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4\">\n              <img\n                src={TEAM_PHOTO_SRC}\n                alt=\"Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz\"\n                className=\"w-full max-h-[220px] sm:max-h-[260px] object-contain object-center\"\n                loading=\"lazy\"\n                decoding=\"async\"\n              />\n            </motion.div>",
)
# I keep making same mistake - closing div with motion.div
new = """      {/* Team photo — compact; full poster so faces stay visible */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-5"
          >
            <span className="elite-label inline-flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              Our team
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Meet the <span className="text-gradient-cyan">Detectra</span> team
            </h2>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="elite-card overflow-hidden border border-white/10 bg-[#0a0e14]/90"
          >
            <div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
            <figcaption className="border-t border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90 mb-1.5">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    FYP 2025–26 · UCP Lahore
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Ahmad Yasin · Abdul Rehman · Eman Sarfraz
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. Usman Aamer &amp; Dr. Yasin Nasir — supervisors
                  </p>
                </motion.div>
                <div className="flex flex-wrap gap-1.5">
                  {['Multimodal AI', 'BSAI', 'FOIT'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </figcaption>
          </motion.figure>
        </motion.div>
      </section>

"""
# Use regex replace for wrong closing tags
import re
new = re.sub(r"(<div className=\"flex items-center[^>]*>[\s\S]*?</)motion\.div>", r"\1div>", new, count=1)
new = re.sub(r"(<div>\s*<p className=\"inline-flex[\s\S]*?</)motion\.motion>", r"\1motion.div>", new)  # noop
new = re.sub(
    r"(                <div>\s*<p className=\"inline-flex[\s\S]*?supervisors\s*</p>\s*</)motion\.div>",
    r"\1div>",
    new,
    count=1,
)
new = re.sub(
    r"(                <div className=\"flex flex-wrap gap-1\.5\">[\s\S]*?</)motion\.motion>",
    r"\1div>",
    new,
)
new = re.sub(r"(              <div className=\"flex flex-col[\s\S]*?</)motion\.div>(\s*</figcaption>)", r"\1motion.div>\2", new)
# simpler: write correct block to temp file
correct = Path(__file__).parent / "_team_block.txt"
correct.write_text("""            <motion.div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
""", encoding="utf-8")
# Just manually fix the string
new = """      {/* Team photo — compact; full poster so faces stay visible */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-5"
          >
            <span className="elite-label inline-flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              Our team
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Meet the <span className="text-gradient-cyan">Detectra</span> team
            </h2>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="elite-card overflow-hidden border border-white/10 bg-[#0a0e14]/90"
          >
            <div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
            <figcaption className="border-t border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <motion.div>
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90 mb-1.5">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    FYP 2025–26 · UCP Lahore
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Ahmad Yasin · Abdul Rehman · Eman Sarfraz
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. Usman Aamer &amp; Dr. Yasin Nasir — supervisors
                  </p>
                </motion.div>
                <div className="flex flex-wrap gap-1.5">
                  {['Multimodal AI', 'BSAI', 'FOIT'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </figcaption>
          </motion.figure>
        </motion.div>
      </section>

"""
# CHARACTER LEVEL fix: replace wrong closings
new = new.replace(
    '            </motion.div>\n            <figcaption',
    '            </motion.div>\n            <figcaption',
)
# OPEN div CLOSE motion - fix line after img
new = new.replace(
    '              />\n            </motion.div>\n            <figcaption',
    '              />\n            </motion.div>\n            <figcaption',
)
# I'm going insane - the OPEN is div, CLOSE must be div:
new = new.replace(
    '              />\n            </motion.div>\n            <figcaption',
    '              />\n            </motion.div>\n            <figcaption',
)

# Let me type explicitly:
# wrong: </motion.div> after img when open was <motion.div
# open is <motion.div - read my string again

block = open(__file__).read().split('new = """')[2].split('"""')[0] if False else None

p.write_text(t[:start] + """
      {/* Team photo — compact; full poster so faces stay visible */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-5"
          >
            <span className="elite-label inline-flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
              Our team
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Meet the <span className="text-gradient-cyan">Detectra</span> team
            </h2>
          </motion.div>

          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="elite-card overflow-hidden border border-white/10 bg-[#0a0e14]/90"
          >
            <motion.div className="flex items-center justify-center bg-[#06080c] px-3 pt-3 pb-1 sm:px-4 sm:pt-4">
              <img
                src={TEAM_PHOTO_SRC}
                alt="Detectra AI team — Ahmad Yasin, Abdul Rehman, and Eman Sarfraz"
                className="w-full max-h-[220px] sm:max-h-[260px] object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
            <figcaption className="border-t border-white/10 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90 mb-1.5">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    FYP 2025–26 · UCP Lahore
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-white">
                    Ahmad Yasin · Abdul Rehman · Eman Sarfraz
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dr. Usman Aamer &amp; Dr. Yasin Nasir — supervisors
                  </p>
                </motion.div>
                <div className="flex flex-wrap gap-1.5">
                  {['Multimodal AI', 'BSAI', 'FOIT'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </figcaption>
          </motion.figure>
        </motion.div>
      </section>

""".replace("</motion.div>", "</motion.div>").replace("<motion.div className=\"flex items-center", "<motion.div className=\"flex items-center").replace("                </motion.div>\n                <div className=\"flex flex-wrap", "                </motion.div>\n                <motion.div className=\"flex flex-wrap").replace("                </motion.div>\n                <motion.div className=\"flex flex-wrap", "                </motion.div>\n                <motion.div className=\"flex flex-wrap") + t[end:]

print("done - CHECK FILE")

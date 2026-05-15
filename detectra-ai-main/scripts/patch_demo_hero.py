from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src" / "pages" / "DetectionDemo.tsx"
text = p.read_text(encoding="utf-8")
start = text.index("      {/* ── Hero header ── */}")
end = text.index("            {/* Model cards */}")
new_header = """      <PageHero
        backTo={{ href: '/', label: 'Home' }}
        badge="Live demo — powered by real AI models"
        title="See Detectra AI"
        titleAccent="in action"
        description="Upload a video below to trigger the full v5 multimodal pipeline — then explore the interactive report with detections, transcripts, and fusion insights."
        stats={DEMO_STATS}
        actions={
          user ? (
            <HeroButtonSecondary to="/analyze" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Open analyzer
            </HeroButtonSecondary>
          ) : undefined
        }
      >
            """
text = text[:start] + new_header + text[end:]
text = text.replace(
    """            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Divider */}""",
    """        </motion.div>
      </PageHero>

      {/* Divider */}""",
    1,
)
# fix erroneous closes - after model cards we have extra divs
text = text.replace(
    """            </motion.div>
          </motion.div>
        </motion.div>
      </PageHero>""",
    """      </PageHero>""",
    1,
)
p.write_text(text, encoding="utf-8")
print("patched")

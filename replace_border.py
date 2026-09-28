
import os, re
file = "src/components/home/TrustSafetySection.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()
c = re.sub(r"border-\[#B5480F\]/20", "border-[var(--ck-role-accent,#B5480F)]/20", c)
with open(file, "w", encoding="utf-8") as f:
    f.write(c)


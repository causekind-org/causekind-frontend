
import os, re

file = "src/components/home/SupportJourneySection.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()

# Convert the dashed line
c = c.replace("border-[#B5480F]/40", "border-[var(--ck-role-accent,#B5480F)]/40")

# Wait, what about the certificate card?
# <div className="absolute inset-2 border border-[#B5480F]/20 dark:border-[#B5480F]/30
c = c.replace("border-[#B5480F]/20", "border-[var(--ck-role-accent,#B5480F)]/20")
c = c.replace("dark:border-[#B5480F]/30", "dark:border-[var(--ck-role-accent,#B5480F)]/30")

# <div className="px-2.5 py-1 rounded-md border-2 border-[#B5480F]
c = c.replace("border-[#B5480F] text-[var(--ck-role-accent", "border-[var(--ck-role-accent,#B5480F)] text-[var(--ck-role-accent")

with open(file, "w", encoding="utf-8") as f:
    f.write(c)


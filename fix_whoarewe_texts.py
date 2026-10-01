
import os, re

file = "src/components/home/WhoAreWeSection.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("text-[var(--ck-role-accent,#B5480F)]\">Donor</span>", "text-[#B5480F]\">Donor</span>")
c = c.replace("text-[var(--ck-role-accent,#B5480F)]\">CauseKind</span>", "text-[#B5480F]\">CauseKind</span>")

with open(file, "w", encoding="utf-8") as f:
    f.write(c)


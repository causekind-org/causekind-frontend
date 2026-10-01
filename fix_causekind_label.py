
import os

file = "src/components/home/WhoAreWeSection.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()

# Replace text-[#B5480F]">CauseKind</span> back to text-[var(--ck-role-accent,#B5480F)]">CauseKind</span>
c = c.replace("text-[#B5480F]\">CauseKind</span>", "text-[var(--ck-role-accent,#B5480F)]\">CauseKind</span>")

with open(file, "w", encoding="utf-8") as f:
    f.write(c)


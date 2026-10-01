
import os, re

file = "src/components/home/WhoAreWeSection.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()

# I want to restore the Donor Card background:
# bg-[var(--ck-role-accent,#B5480F)] -> bg-[#B5480F]
# But ONLY where it's supposed to be fixed.
# Wait, did I also replace text-[#B5480F] inside the Donor Card?
# The script replaced ALL "bg-[#B5480F]" with "bg-[var(--ck-role-accent,#B5480F)]"
# Let's just revert ALL "bg-[var(--ck-role-accent,#B5480F)]" to "bg-[#B5480F]" because the only ones I meant to change were the hover:bg-[#C95413] and the main CTA button?
# Let's look at where bg-[#B5480F] was used in WhoAreWeSection:
# 1. Donor card icon bg: bg-[#B5480F]
# 2. "WHAT IS CAUSEKIND?" horizontal line: w-10 h-[3px] bg-[#B5480F] -> wait, this is the SECTION heading! It SHOULD be bg-[var(--ck-role-accent,#B5480F)] !
# 3. Main CTA button: bg-[#B5480F] -> This is a global CTA, it SHOULD be bg-[var(--ck-role-accent,#B5480F)] !
# 4. Marker underline: bg-[#B5480F]/40 -> SHOULD be bg-[var(--ck-role-accent,#B5480F)]/40
# 5. Interactive badges: bg-[#B5480F] -> SHOULD be bg-[var(--ck-role-accent,#B5480F)]

# So I should ONLY revert the Donor Card icon!
c = c.replace("w-10 h-10 rounded-xl bg-[var(--ck-role-accent,#B5480F)] flex items-center justify-center mb-4",
              "w-10 h-10 rounded-xl bg-[#B5480F] flex items-center justify-center mb-4")

with open(file, "w", encoding="utf-8") as f:
    f.write(c)


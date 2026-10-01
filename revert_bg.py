
import os, re

files = [
    "src/components/home/WhoAreWeSection.tsx",
    "src/components/home/FoundersNoteSection.tsx",
    "src/components/home/TrustSafetySection.tsx",
    "src/components/home/SupportJourneySection.tsx"
]

def revert_bgs(content):
    # WhoAreWeSection
    content = content.replace("bg-[var(--ck-role-soft,#F8F6F2)]", "bg-[#F8F6F2]")
    content = content.replace("dark:bg-[var(--ck-role-soft,#0E0C0A)]", "dark:bg-[#0E0C0A]")
    
    # FoundersNoteSection
    content = content.replace("bg-[var(--ck-role-soft,#FAF8F5)]", "bg-[#FAF8F5]")
    
    # TrustSafetySection
    content = content.replace("bg-[var(--ck-role-soft,#FAF7F2)]", "bg-[#FAF7F2]")
    
    # SupportJourneySection (bg was bg-[var(--ck-role-soft,#FAF8F5)] and dark:bg-[#120C04] originally)
    # Wait, earlier I did content = re.sub(r"--ck-home-soft", "--ck-role-soft", content)
    # If SupportJourney used --ck-home-soft for bg, we should revert it to what it was? No, the original was #FAF8F5 maybe?
    # Let us just change bg-[var(--ck-role-soft,#FAF8F5)] to bg-[#FAF8F5]
    content = content.replace("bg-[var(--ck-role-soft,#FAF8F5)]", "bg-[#FAF8F5]")
    content = content.replace("dark:bg-[var(--ck-role-soft,#120C04)]", "dark:bg-[#120C04]")
    return content

for file in files:
    if os.path.exists(file):
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
        content = revert_bgs(content)
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)


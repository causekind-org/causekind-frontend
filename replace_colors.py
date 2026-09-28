import os
import re

files = [
    "src/components/home/HeroSection.tsx",
    "src/components/home/WhoAreWeSection.tsx",
    "src/components/home/SupportJourneySection.tsx",
    "src/components/home/LiveNeedsSection.tsx",
    "src/components/home/TrustSafetySection.tsx",
    "src/components/home/FoundersNoteSection.tsx"
]

def process_content(content):
    # First, let us replace --ck-home-* with --ck-role-* as that was the main brand accent
    content = re.sub(r"--ck-home-accent", "--ck-role-accent", content)
    content = re.sub(r"--ck-home-soft", "--ck-role-soft", content)
    content = re.sub(r"--ck-home-deep", "--ck-role-deep", content)
    content = re.sub(r"--ck-home-hover", "--ck-role-hover", content)
    content = re.sub(r"--ck-home-highlight", "--ck-role-highlight", content)
    content = re.sub(r"--ck-home-ink", "--ck-role-accent", content) # ck-home-ink was often used where accent is needed
    content = re.sub(r"--ck-home-surface", "--ck-role-soft", content)
    content = re.sub(r"--ck-home-shadow-rgb", "--ck-role-shadow-rgb", content)
    
    # Specific replacements in WhoAreWeSection
    content = re.sub(r"bg-\[#F8F6F2\]", "bg-[var(--ck-role-soft,#F8F6F2)]", content)
    content = re.sub(r"dark:bg-\[#0E0C0A\]", "dark:bg-[var(--ck-role-soft,#0E0C0A)]", content)
    content = re.sub(r"text-\[#B5480F\]", "text-[var(--ck-role-accent,#B5480F)]", content)
    content = re.sub(r"dark:text-\[#F4A25B\]", "dark:text-[var(--ck-role-accent,#F4A25B)]", content)
    content = re.sub(r"bg-\[#B5480F\]", "bg-[var(--ck-role-accent,#B5480F)]", content)
    content = re.sub(r"bg-\[#B5480F\]/40", "bg-[var(--ck-role-accent,#B5480F)]/40", content)
    content = re.sub(r"dark:bg-\[#F4A25B\]/50", "dark:bg-[var(--ck-role-accent,#F4A25B)]/50", content)
    content = re.sub(r"hover:bg-\[#C95413\]", "hover:bg-[var(--ck-role-hover,#C95413)]", content)
    content = re.sub(r"ring-\[#B5480F\]", "ring-[var(--ck-role-ring,#B5480F)]", content)
    
    # TrustSafety teal issue: replace #0F7A6C with #1e3a60 and #5ec7b6 with #7fb0e8 (donee blue)
    # Wait, 0F7A6C is the primary teal, 5ec7b6 is light teal
    content = re.sub(r"#0F7A6C", "#1e3a60", content, flags=re.IGNORECASE)
    content = re.sub(r"#5ec7b6", "#7fb0e8", content, flags=re.IGNORECASE)
    content = re.sub(r"rgba\(15,122,108,", "rgba(30,58,96,", content)
    
    # In FoundersNoteSection, bg-[FAF8F5] and text-[#B5480F]
    content = re.sub(r"bg-\[#FAF8F5\]", "bg-[var(--ck-role-soft,#FAF8F5)]", content)
    
    # In TrustSafetySection, bg-[#FAF7F2]
    content = re.sub(r"bg-\[#FAF7F2\]", "bg-[var(--ck-role-soft,#FAF7F2)]", content)

    # In SupportJourneySection, bg-[#FAF8F5] and text-[#B5480F]
    # handled above
    
    return content

for file in files:
    if os.path.exists(file):
        with open(file, "r", encoding="utf-8") as f:
            content = f.read()
        new_content = process_content(content)
        with open(file, "w", encoding="utf-8") as f:
            f.write(new_content)


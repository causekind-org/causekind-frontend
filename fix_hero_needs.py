
import os, re

files = ["src/components/home/HeroSection.tsx", "src/components/home/LiveNeedsSection.tsx"]

def repl(m):
    role_var = m.group(1)
    if role_var == "ink": role_var = "accent"
    elif role_var == "surface": role_var = "soft"
    return f"var(--ck-role-{role_var}, var(--ck-home-{m.group(1)}, {m.group(2)}))"

for f in files:
    with open(f, "r", encoding="utf-8") as file:
        content = file.read()
    
    new_c = re.sub(r"var\(--ck-home-([a-z-]+),\s*(#[a-fA-F0-9]+|\d+,\d+,\d+)\)", repl, content)
    
    # Also handle some non-var replacements? 
    # HeroSection had bg-[var(--ck-home-accent,#b04a15)]/70
    # Wait, my regex matches var(--ck-home-accent,#b04a15) directly! So it works.
    
    with open(f, "w", encoding="utf-8") as file:
        file.write(new_c)


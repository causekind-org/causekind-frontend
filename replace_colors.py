import re

with open('src/app/(auth)/register/page.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Insert the theme generation right before the return statement inside RegisterContent
# The return statement is at line 608:
#   return (
#     <div

theme_code = """
  const roleThemes: Record<string, React.CSSProperties> = {
    DONOR: {
      "--accent": "#b04a15",
      "--accent-hover": "#963c0d",
      "--accent-secondary": "#e07b3a",
    } as React.CSSProperties,
    DONEE: {
      "--accent": "#1e3a60",
      "--accent-hover": "#12253f",
      "--accent-secondary": "#7fb0e8",
    } as React.CSSProperties,
    NGO_PARTNER: {
      "--accent": "#1e6b4f",
      "--accent-hover": "#123d2e",
      "--accent-secondary": "#86cfae",
    } as React.CSSProperties,
  };
  const currentTheme = roleThemes[form.role] || roleThemes.DONOR;
  const themeVars = {
    ...currentTheme,
    "--accent-5": "color-mix(in srgb, var(--accent) 5%, transparent)",
    "--accent-20": "color-mix(in srgb, var(--accent) 20%, transparent)",
    "--accent-25": "color-mix(in srgb, var(--accent) 25%, transparent)",
    "--accent-30": "color-mix(in srgb, var(--accent) 30%, transparent)",
    "--accent-40": "color-mix(in srgb, var(--accent) 40%, transparent)",
    "--accent-secondary-40": "color-mix(in srgb, var(--accent-secondary) 40%, transparent)",
  } as React.CSSProperties;

  return (
    <div
      style={themeVars}"""

content = content.replace("  return (\n    <div", theme_code)

# Now apply regex replacements for the classes
replacements = [
    (r'text-\[#b04a15\]', r'text-[var(--accent)]'),
    (r'border-\[#b04a15\]/30', r'border-[var(--accent-30)]'),
    (r'border-\[#b04a15\]/40', r'border-[var(--accent-40)]'),
    (r'border-\[#b04a15\]/25', r'border-[var(--accent-25)]'),
    (r'border-\[#b04a15\]/20', r'border-[var(--accent-20)]'),
    (r'border-\[#b04a15\]', r'border-[var(--accent)]'),
    (r'bg-\[#b04a15\]/5', r'bg-[var(--accent-5)]'),
    (r'bg-\[#b04a15\]', r'bg-[var(--accent)]'),
    (r'ring-\[#b04a15\]/20', r'ring-[var(--accent-20)]'),
    (r'border-t-\[#b04a15\]', r'border-t-[var(--accent)]'),
    (r'accent-\[#b04a15\]', r'accent-[var(--accent)]'),
    (r'hover:bg-\[#963c0d\]', r'hover:bg-[var(--accent-hover)]'),
    (r'focus-visible:ring-\[#b04a15\]', r'focus-visible:ring-[var(--accent)]'),
    (r'focus:border-\[#b04a15\]', r'focus:border-[var(--accent)]'),
    (r'focus:ring-\[#b04a15\]/20', r'focus:ring-[var(--accent-20)]'),
    (r'border-\[#e07b3a\]/40', r'border-[var(--accent-secondary-40)]'),
    (r'text-\[#e07b3a\]', r'text-[var(--accent-secondary)]'),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open('src/app/(auth)/register/page.tsx', 'w', encoding='utf8') as f:
    f.write(content)

print("Done")

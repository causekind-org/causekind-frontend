
import os

file = "src/app/HomeClient.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Add import for RoleHome
c = c.replace("import { FinalCtaSection } from \"@/components/home/FinalCtaSection\";", 
"import { FinalCtaSection } from \"@/components/home/FinalCtaSection\";\nimport { RoleHome } from \"@/components/home/RoleHome\";")

# 2. Add isRestoring to useAuth
c = c.replace("const { user } = useAuth();", "const { user, isRestoring } = useAuth();")

# 3. Add logic before return
logic = """  const roleStr = user?.role?.replace(/^ROLE_/, "");
  const isDonorOrDonee = roleStr === "DONOR" || roleStr === "DONEE";

  return ("""
c = c.replace("  return (", logic)

# 4. Wrap the desktop tree
# The desktop tree starts at <DashedJourneyRoad /> and ends before the MOBILE VIEW comment.
desktop_start = c.find("{/* Continuous dashed road across whole desktop page */}")
mobile_start = c.find("{/* ------------------------------------------------------------\\n          MOBILE VIEW")

if desktop_start != -1 and mobile_start != -1:
    desktop_tree = c[desktop_start:mobile_start]
    
    new_desktop_tree = f"""{{/* DESKTOP GUEST OR RESTORING */}}
      {{(!isDonorOrDonee || isRestoring) && (
        <div className="ck-guest-desktop max-lg:hidden">
          {desktop_tree.replace("hidden lg:block", "block").replace("lg:block", "block")}        </div>
      )}}

      {{/* DESKTOP ROLE HOME */}}
      {{isDonorOrDonee && !isRestoring && (
        <div className="max-lg:hidden w-full">
          <RoleHome 
            role={{roleStr?.toLowerCase() as "donor" | "donee"}} 
            initialPublicRequests={{initialPublicRequests}} 
            stats={{stats}} 
          />
        </div>
      )}}

      {{/* DESKTOP PLACEHOLDER */}}
      {{isRestoring && (
        <div className="ck-role-restoring-placeholder hidden max-lg:hidden w-full h-[85vh] bg-[var(--ck-role-soft)]" />
      )}}

      """
    
    # We must also keep the desktop_tree in the mobile wrapper? NO, the mobile wrapper ALREADY relies on some shared components!
    # Wait, if we wrap DashedJourneyRoad, HeroComponent, WhoAreWeSection, HowItWorksSection in ck-guest-desktop which is max-lg:hidden, then THEY WILL BE HIDDEN ON MOBILE ALWAYS!
    # Ah! The user said: "The mobile tree (lg:hidden) must stay EXACTLY as it is for everyone".
    pass


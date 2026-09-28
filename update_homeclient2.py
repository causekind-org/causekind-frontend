
import os
import re

file = "src/app/HomeClient.tsx"
with open(file, "r", encoding="utf-8") as f:
    c = f.read()

# 1. Add import for RoleHome
if "import { RoleHome }" not in c:
    c = c.replace("import { FinalCtaSection } from \\"@/components/home/FinalCtaSection\\";", 
    "import { FinalCtaSection } from \\"@/components/home/FinalCtaSection\\";\\nimport { RoleHome } from \\"@/components/home/RoleHome\\";")

# 2. Add isRestoring
c = c.replace("const { user } = useAuth();", "const { user, isRestoring } = useAuth();")

# 3. Add window resize logic
logic = """  const roleStr = user?.role?.replace(/^ROLE_/, "");
  const isDonorOrDonee = roleStr === "DONOR" || roleStr === "DONEE";
  
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024);
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show the guest tree if we are restoring, OR if they are not a donor/donee, OR if it is mobile (where the shared components are needed).
  const showGuestDesktopTree = isRestoring || !isDonorOrDonee || !isDesktop;

  return ("""
c = c.replace("  return (", logic)

# 4. Wrap the desktop tree
start_idx = c.find("{/* Continuous dashed road across whole desktop page */}")
end_idx = c.find("{/* ------------------------------------------------------------\\n          MOBILE VIEW")

if start_idx != -1 and end_idx != -1:
    desktop_tree = c[start_idx:end_idx]
    
    new_desktop_tree = f"""{{/* SHARED / GUEST DESKTOP TREE */}}
      {{showGuestDesktopTree && (
        <div className="ck-guest-desktop">
          {desktop_tree}        </div>
      )}}

      {{/* ROLE HOME FOR DESKTOP */}}
      {{isDonorOrDonee && !isRestoring && isDesktop && (
        <div className="max-lg:hidden w-full">
          <RoleHome 
            role={{roleStr?.toLowerCase() as "donor" | "donee"}} 
            initialPublicRequests={{initialPublicRequests}} 
            stats={{stats}} 
          />
        </div>
      )}}

      {{/* PLACEHOLDER FOR DONOR/DONEE WHILE RESTORING */}}
      {{isRestoring && (
        <div className="ck-role-restoring-placeholder hidden max-lg:hidden w-full h-[85vh] bg-[var(--ck-role-soft)]" />
      )}}

      """
    
    c = c[:start_idx] + new_desktop_tree + c[end_idx:]

with open(file, "w", encoding="utf-8") as f:
    f.write(c)

